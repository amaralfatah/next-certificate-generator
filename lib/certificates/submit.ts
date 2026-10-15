import { and, asc, count, eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { certificates, events, formFields, submissions } from "@/lib/db/schema";
import { type FieldErrors, formAvailability, validateSubmission } from "@/lib/forms";
import { formatCertificateNumber } from "@/lib/pdf/layout";
import { peek, hit } from "@/lib/security/rate-limit";
import { verifyCode } from "@/lib/security/crypto";

export type SubmitInput = {
  slug: string;
  name: string;
  email: string;
  answers: Record<string, string>;
  attendanceCode?: string;
  /** Hashed client IP; null disables per-IP limits (tests, unknown IP). */
  ipHash: string | null;
};

export type SubmitResult =
  | { ok: true; certificateId: string; number: string }
  | {
      ok: false;
      code:
        | "not_found"
        | "unavailable"
        | "invalid"
        | "duplicate"
        | "bad_code"
        | "code_locked"
        | "rate_limited";
      message: string;
      fieldErrors?: FieldErrors;
    };

export const LIMITS = {
  codeFailures: { max: 5, windowSeconds: 600 },
  submitsPerIp: { max: 20, windowSeconds: 600 },
};

const UNAVAILABLE: Record<string, string> = {
  draft: "Form ini belum dipublikasikan.",
  not_yet: "Form ini belum dibuka.",
  closed: "Form ini sudah ditutup.",
  full: "Kuota sertifikat untuk acara ini sudah habis.",
};

class QuotaFull extends Error {}

function isUniqueViolation(e: unknown): boolean {
  for (let err = e as { code?: string; cause?: unknown } | undefined; err; err = err.cause as typeof err) {
    if (err.code === "23505") return true;
  }
  return false;
}

/**
 * Validates a participant submission and, inside one transaction, stores it and assigns
 * the next certificate number. PDF rendering and email happen afterwards (see issue.ts),
 * so a rendering failure never loses the submission.
 */
export async function submitForm(db: DB, input: SubmitInput, now = new Date()): Promise<SubmitResult> {
  const [event] = await db.select().from(events).where(eq(events.slug, input.slug));
  if (!event) return { ok: false, code: "not_found", message: "Acara tidak ditemukan." };

  if (input.ipHash && !(await hit(db, `submit:${input.ipHash}`, LIMITS.submitsPerIp.max, LIMITS.submitsPerIp.windowSeconds))) {
    return { ok: false, code: "rate_limited", message: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." };
  }

  const [{ issued }] = await db
    .select({ issued: count() })
    .from(submissions)
    .where(eq(submissions.eventId, event.id));
  const availability = formAvailability(event, issued, now);
  if (availability !== "open") return { ok: false, code: "unavailable", message: UNAVAILABLE[availability] };

  const fields = await db
    .select()
    .from(formFields)
    .where(eq(formFields.eventId, event.id))
    .orderBy(asc(formFields.position));
  const v = validateSubmission(fields, input);
  if (!v.ok) {
    return { ok: false, code: "invalid", message: "Periksa kembali isian form.", fieldErrors: v.errors };
  }

  if (event.attendanceCodeHash) {
    const lockKey = `code:${event.id}:${input.ipHash ?? "anon"}`;
    if ((await peek(db, lockKey)) >= LIMITS.codeFailures.max) {
      return {
        ok: false,
        code: "code_locked",
        message: "Terlalu banyak kode salah. Coba lagi dalam 10 menit.",
      };
    }
    if (!input.attendanceCode || !verifyCode(input.attendanceCode, event.attendanceCodeHash)) {
      await hit(db, lockKey, LIMITS.codeFailures.max, LIMITS.codeFailures.windowSeconds);
      return {
        ok: false,
        code: "bad_code",
        message: "Kode kehadiran salah.",
        fieldErrors: { attendanceCode: "Kode kehadiran salah." },
      };
    }
  }

  const duplicate = () =>
    ({
      ok: false,
      code: "duplicate",
      message: "Email ini sudah menerima sertifikat untuk acara ini.",
    }) as const;

  const [existing] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.eventId, event.id), sql`lower(${submissions.email}) = ${v.value.email}`));
  if (existing) return duplicate();

  try {
    return await db.transaction(async (tx) => {
      // Locks the event row until commit: concurrent submits queue here, so the
      // quota check and the sequence number are both race-free.
      const [{ seq }] = await tx
        .update(events)
        .set({ certSeq: sql`${events.certSeq} + 1` })
        .where(eq(events.id, event.id))
        .returning({ seq: events.certSeq });

      if (event.quota != null) {
        const [{ n }] = await tx.select({ n: count() }).from(submissions).where(eq(submissions.eventId, event.id));
        if (n >= event.quota) throw new QuotaFull();
      }

      const [sub] = await tx
        .insert(submissions)
        .values({
          eventId: event.id,
          name: v.value.name,
          email: v.value.email,
          answers: v.value.answers,
          ipHash: input.ipHash,
        })
        .returning({ id: submissions.id });

      const number = formatCertificateNumber(event.numberPrefix, Number(event.date.slice(0, 4)), seq);
      const [cert] = await tx
        .insert(certificates)
        .values({ submissionId: sub.id, number })
        .returning({ id: certificates.id });

      return { ok: true as const, certificateId: cert.id, number };
    });
  } catch (e) {
    if (e instanceof QuotaFull) return { ok: false, code: "unavailable", message: UNAVAILABLE.full };
    if (isUniqueViolation(e)) return duplicate();
    throw e;
  }
}
