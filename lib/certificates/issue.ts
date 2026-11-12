import "server-only";
import { and, count, eq, gte, isNull, or, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { certificates, events, submissions, templates, type Event, type Template } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { type Answers, answerText } from "@/lib/forms";
import { formatEventDate } from "@/lib/i18n";
import { certificateMail, sendMail } from "@/lib/mail";
import { loadFont } from "@/lib/pdf/fonts.server";
import { getPreset } from "@/lib/pdf/presets";
import { renderCertificate } from "@/lib/pdf/render";
import { storage } from "@/lib/storage";

export const verifyUrl = (number: string) => `${env.appUrl}/v/${encodeURIComponent(number)}`;
export const pdfKeyFor = (eventId: string, number: string) => `events/${eventId}/certificates/${number}.pdf`;
export const pdfFileName = (number: string) => `sertifikat-${number}.pdf`;

export function certificateValues(
  event: Pick<Event, "title" | "date" | "endDate" | "organizerLabel">,
  p: { name: string; number: string; answers: Answers },
): Record<string, string> {
  return {
    ...Object.fromEntries(Object.entries(p.answers).map(([k, v]) => [k, answerText(v)])),
    nama: p.name,
    acara: event.title,
    tanggal: formatEventDate(event.date, event.endDate),
    nomor: p.number,
    penyelenggara: event.organizerLabel,
  };
}

export async function renderForTemplate(template: Template, title: string, values: Record<string, string>, qrUrl: string) {
  const bytes = template.backgroundKey ? await storage().get(template.backgroundKey) : null;
  return renderCertificate({
    widthPt: template.widthPt,
    heightPt: template.heightPt,
    background: bytes && template.backgroundType ? { bytes, type: template.backgroundType } : null,
    shapes: template.backgroundKey ? undefined : getPreset(template.preset)?.shapes,
    fields: template.fields,
    values,
    qrUrl,
    loadFont,
    watermark: true,
    title,
  });
}

async function loadCertificate(db: DB, certificateId: string) {
  const [row] = await db
    .select({ cert: certificates, sub: submissions, event: events, template: templates })
    .from(certificates)
    .innerJoin(submissions, eq(submissions.id, certificates.submissionId))
    .innerJoin(events, eq(events.id, submissions.eventId))
    .innerJoin(templates, eq(templates.eventId, events.id))
    .where(eq(certificates.id, certificateId));
  return row;
}

/** Renders the PDF and stores it. Returns false (certificate stays pending) on failure. */
export async function issuePdf(db: DB, certificateId: string): Promise<boolean> {
  try {
    const row = await loadCertificate(db, certificateId);
    if (!row) return false;
    if (row.cert.pdfKey) return true;
    const values = certificateValues(row.event, { name: row.sub.name, number: row.cert.number, answers: row.sub.answers });
    const pdf = await renderForTemplate(row.template, `Sertifikat ${row.event.title} - ${row.sub.name}`, values, verifyUrl(row.cert.number));
    const key = pdfKeyFor(row.event.id, row.cert.number);
    await storage().put(key, pdf, "application/pdf");
    await db.update(certificates).set({ pdfKey: key }).where(eq(certificates.id, certificateId));
    return true;
  } catch (e) {
    console.error("issuePdf failed", certificateId, e);
    return false;
  }
}

export async function emailsSentToday(db: DB) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(certificates)
    .where(and(eq(certificates.emailStatus, "sent"), gte(certificates.emailedAt, sql`date_trunc('day', now())`)));
  return n;
}

/** Emails the PDF as an attachment. Never throws: the outcome is stored as email_status. */
export async function emailCertificate(db: DB, certificateId: string) {
  const setStatus = (emailStatus: "sent" | "failed" | "skipped") =>
    db
      .update(certificates)
      .set({ emailStatus, emailedAt: emailStatus === "sent" ? new Date() : null })
      .where(eq(certificates.id, certificateId));
  try {
    const row = await loadCertificate(db, certificateId);
    if (!row || row.cert.status === "revoked" || !row.cert.pdfKey) return;
    if (env.mailEnabled && (await emailsSentToday(db)) >= env.emailDailyLimit) {
      await setStatus("failed");
      return;
    }
    const pdf = await storage().get(row.cert.pdfKey);
    if (!pdf) throw new Error("PDF missing in storage");
    const mail = certificateMail({
      name: row.sub.name,
      eventTitle: row.event.title,
      organizer: row.event.organizerLabel,
      number: row.cert.number,
      verifyUrl: verifyUrl(row.cert.number),
    });
    const result = await sendMail({
      to: row.sub.email,
      ...mail,
      attachments: [{ filename: pdfFileName(row.cert.number), content: pdf }],
    });
    await setStatus(result);
  } catch (e) {
    console.error("emailCertificate failed", certificateId, e);
    await setStatus("failed").catch(() => {});
  }
}

/** How many certificates one "Kirim ulang" press works through, so the request stays well inside a function's time limit. */
export const RETRY_BATCH = 20;

/** A valid certificate that never reached its participant: the PDF is still pending or the email failed. */
export const isUndelivered = and(
  eq(certificates.status, "valid"),
  or(isNull(certificates.pdfKey), eq(certificates.emailStatus, "failed")),
);
const undelivered = (eventId: string) => and(eq(submissions.eventId, eventId), isUndelivered);

export async function undeliveredCount(db: DB, eventId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(certificates)
    .innerJoin(submissions, eq(submissions.id, certificates.submissionId))
    .where(undelivered(eventId));
  return n;
}

const dailyLimitReached = async (db: DB) => env.mailEnabled && (await emailsSentToday(db)) >= env.emailDailyLimit;

/**
 * Rebuilds pending PDFs and re-sends failed emails for one event, oldest first, one batch per call.
 * Stops as soon as the daily email limit is reached so the remaining ones are not retried for nothing.
 */
export async function retryUndelivered(db: DB, eventId: string, batch = RETRY_BATCH) {
  const before = await undeliveredCount(db, eventId);
  const rows = await db
    .select({ id: certificates.id, pdfKey: certificates.pdfKey })
    .from(certificates)
    .innerJoin(submissions, eq(submissions.id, certificates.submissionId))
    .where(undelivered(eventId))
    .orderBy(certificates.createdAt)
    .limit(batch);
  let limitReached = false;
  for (const row of rows) {
    if (!row.pdfKey && !(await issuePdf(db, row.id))) continue;
    if ((limitReached = await dailyLimitReached(db))) {
      // The PDF exists now, so the participant can download it; the email waits for tomorrow's quota.
      if (!row.pdfKey) await db.update(certificates).set({ emailStatus: "failed" }).where(eq(certificates.id, row.id));
      continue;
    }
    await emailCertificate(db, row.id);
  }
  const remaining = await undeliveredCount(db, eventId);
  return { fixed: before - remaining, remaining, limitReached, mailEnabled: env.mailEnabled };
}
