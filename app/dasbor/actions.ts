"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { imageSize } from "image-size";
import { z } from "zod";
import { requireOrganizer } from "@/lib/auth/session";
import { emailCertificate, issuePdf } from "@/lib/certificates/issue";
import { certificates, db, events, formFields, submissions, templates } from "@/lib/db";
import { getOwnedEvent, publishBlockers } from "@/lib/events";
import { FONT_IDS } from "@/lib/fonts";
import { fieldKey } from "@/lib/forms";
import { fromLocalInput } from "@/lib/i18n";
import { defaultLayout, pageSizeFor } from "@/lib/pdf/layout";
import { getPreset } from "@/lib/pdf/presets";
import { BUILTIN_KEYS } from "@/lib/pdf/types";
import { hashCode } from "@/lib/security/crypto";
import { eventSlug, PREFIX_RE, randomSuffix } from "@/lib/slug";
import { storage } from "@/lib/storage";

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string> } | undefined;

const MAX_BACKGROUND_BYTES = 5 * 1024 * 1024;

function zodErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

const detailsSchema = z.object({
  title: z.string().trim().min(3, "Nama acara minimal 3 karakter.").max(120, "Maksimal 120 karakter."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi."),
  organizerLabel: z.string().trim().min(2, "Nama penyelenggara wajib diisi.").max(120, "Maksimal 120 karakter."),
  description: z.string().trim().max(500, "Maksimal 500 karakter.").default(""),
  numberPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PREFIX_RE, "Gunakan 2 sampai 8 huruf kapital atau angka, tanpa spasi."),
});

async function prefixTaken(prefix: string, exceptEventId?: string) {
  const where = exceptEventId
    ? and(eq(events.numberPrefix, prefix), ne(events.id, exceptEventId))
    : eq(events.numberPrefix, prefix);
  const [row] = await (await db()).select({ id: events.id }).from(events).where(where);
  return !!row;
}

async function certificateCount(eventId: string) {
  const [{ n }] = await (await db())
    .select({ n: count() })
    .from(submissions)
    .where(eq(submissions.eventId, eventId));
  return n;
}

// ---------------------------------------------------------------- events

export async function createEvent(_: FormState, formData: FormData): Promise<FormState> {
  const organizer = await requireOrganizer();
  const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  if (await prefixTaken(d.numberPrefix)) {
    return { errors: { numberPrefix: "Prefix ini sudah dipakai acara lain. Coba variasi lain, mis. tambah angka." } };
  }
  const database = await db();
  const id = await database.transaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({ ...d, organizerId: organizer.id, slug: eventSlug(d.title) })
      .returning({ id: events.id });
    await tx.insert(templates).values({ eventId: event.id });
    return event.id;
  });
  redirect(`/dasbor/acara/${id}/template`);
}

export async function updateEventDetails(eventId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { event, db: database } = await getOwnedEvent(eventId);
  const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  if (d.numberPrefix !== event.numberPrefix) {
    if ((await certificateCount(eventId)) > 0) {
      return { errors: { numberPrefix: "Prefix tidak bisa diubah setelah ada sertifikat terbit." } };
    }
    if (await prefixTaken(d.numberPrefix, eventId)) return { errors: { numberPrefix: "Prefix ini sudah dipakai acara lain." } };
  }
  if (d.date.slice(0, 4) !== event.date.slice(0, 4) && (await certificateCount(eventId)) > 0) {
    return { errors: { date: "Tahun acara tidak bisa diubah setelah ada sertifikat terbit (tahun masuk ke nomor sertifikat)." } };
  }
  await database.update(events).set(d).where(eq(events.id, eventId));
  revalidatePath(`/dasbor/acara/${eventId}`, "layout");
  return { ok: true, message: "Detail acara disimpan." };
}

const guardsSchema = z
  .object({
    opensAt: z.string().optional(),
    closesAt: z.string().optional(),
    quota: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .pipe(z.number().int("Kuota harus bilangan bulat.").min(1, "Kuota minimal 1.").max(100_000).nullable()),
    attendanceCode: z
      .string()
      .trim()
      .max(32, "Maksimal 32 karakter.")
      .optional()
      .refine((v) => !v || v.length >= 4, "Kode minimal 4 karakter."),
    removeCode: z.string().optional(),
  })
  .transform((v) => ({ ...v, opensAt: fromLocalInput(v.opensAt), closesAt: fromLocalInput(v.closesAt) }))
  .refine((v) => !v.opensAt || !v.closesAt || v.opensAt < v.closesAt, {
    message: "Waktu tutup harus setelah waktu buka.",
    path: ["closesAt"],
  });

export async function updateGuards(eventId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { db: database } = await getOwnedEvent(eventId);
  const parsed = guardsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const g = parsed.data;
  const patch: Partial<typeof events.$inferInsert> = { opensAt: g.opensAt, closesAt: g.closesAt, quota: g.quota };
  if (g.removeCode) patch.attendanceCodeHash = null;
  else if (g.attendanceCode) patch.attendanceCodeHash = hashCode(g.attendanceCode);
  await database.update(events).set(patch).where(eq(events.id, eventId));
  revalidatePath(`/dasbor/acara/${eventId}`, "layout");
  return { ok: true, message: "Pengaman disimpan." };
}

export async function setEventStatus(eventId: string, status: "open" | "closed" | "draft"): Promise<FormState> {
  const { template, db: database } = await getOwnedEvent(eventId);
  if (status === "open") {
    const blockers = publishBlockers(template);
    if (blockers.length) return { message: blockers.join(" ") };
  }
  await database.update(events).set({ status }).where(eq(events.id, eventId));
  revalidatePath(`/dasbor/acara/${eventId}`, "layout");
  revalidatePath("/dasbor");
  return { ok: true };
}

export async function deleteEvent(eventId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { event, template, db: database } = await getOwnedEvent(eventId);
  if (String(formData.get("confirm") ?? "").trim() !== event.title) {
    return { errors: { confirm: "Ketik nama acara persis untuk mengonfirmasi." } };
  }
  const pdfs = await database
    .select({ key: certificates.pdfKey })
    .from(certificates)
    .innerJoin(submissions, eq(submissions.id, certificates.submissionId))
    .where(eq(submissions.eventId, eventId));
  const keys = [template.backgroundKey, ...pdfs.map((p) => p.key)].filter((k): k is string => !!k);
  await database.delete(events).where(eq(events.id, eventId));
  // Files go after the rows: a failed delete leaves an orphan file, never a dangling row.
  await Promise.allSettled(keys.map((k) => storage().delete(k)));
  revalidatePath("/dasbor");
  redirect("/dasbor");
}

export async function duplicateEvent(eventId: string) {
  const { event, template, db: database } = await getOwnedEvent(eventId);
  const fields = await database.select().from(formFields).where(eq(formFields.eventId, eventId));
  let prefix = `${event.numberPrefix.slice(0, 5)}${randomSuffix(3).toUpperCase()}`;
  while (await prefixTaken(prefix)) prefix = `${event.numberPrefix.slice(0, 5)}${randomSuffix(3).toUpperCase()}`;

  const newId = await database.transaction(async (tx) => {
    const [copy] = await tx
      .insert(events)
      .values({
        organizerId: event.organizerId,
        slug: eventSlug(event.title),
        title: `${event.title} (salinan)`.slice(0, 120),
        date: event.date,
        organizerLabel: event.organizerLabel,
        description: event.description,
        numberPrefix: prefix,
        quota: event.quota,
        attendanceCodeHash: event.attendanceCodeHash,
      })
      .returning({ id: events.id });
    await tx.insert(templates).values({
      eventId: copy.id,
      widthPt: template.widthPt,
      heightPt: template.heightPt,
      fields: template.fields,
      backgroundType: template.backgroundType,
      preset: template.preset,
    });
    if (fields.length) {
      await tx.insert(formFields).values(fields.map(({ id: _id, eventId: _e, ...f }) => ({ ...f, eventId: copy.id })));
    }
    return copy.id;
  });

  if (template.backgroundKey) {
    const bytes = await storage().get(template.backgroundKey);
    if (bytes) {
      const key = `events/${newId}/background-${randomSuffix(6)}.${template.backgroundType}`;
      await storage().put(key, bytes, template.backgroundType === "png" ? "image/png" : "image/jpeg");
      await database.update(templates).set({ backgroundKey: key }).where(eq(templates.eventId, newId));
    }
  }
  revalidatePath("/dasbor");
  redirect(`/dasbor/acara/${newId}`);
}

// ---------------------------------------------------------------- template

const fieldSchema = z.object({
  key: z.string().min(1).max(40),
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().finite().min(10),
  font: z.enum(FONT_IDS),
  size: z.number().min(4).max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  align: z.enum(["left", "center", "right"]),
});

export async function saveTemplateFields(eventId: string, fields: unknown): Promise<FormState> {
  const { template, db: database } = await getOwnedEvent(eventId);
  if ((await certificateCount(eventId)) > 0) {
    return { message: "Template terkunci karena sudah ada sertifikat terbit. Duplikat acara untuk memakai template baru." };
  }
  const parsed = z.array(fieldSchema).max(30).safeParse(fields);
  if (!parsed.success) return { message: "Data kolom tidak valid." };
  const custom = new Set((await database.select({ key: formFields.key }).from(formFields).where(eq(formFields.eventId, eventId))).map((f) => f.key));
  const keys = new Set<string>();
  for (const f of parsed.data) {
    if (keys.has(f.key)) return { message: `Kolom ${f.key} dipasang lebih dari sekali.` };
    if (!(BUILTIN_KEYS as readonly string[]).includes(f.key) && !custom.has(f.key)) return { message: `Kolom ${f.key} tidak dikenal.` };
    keys.add(f.key);
  }
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  const clean = parsed.data.map((f) => ({
    ...f,
    x: clamp(f.x, template.widthPt),
    y: clamp(f.y, template.heightPt),
    w: Math.min(f.w, template.widthPt),
  }));
  await database.update(templates).set({ fields: clean }).where(eq(templates.eventId, eventId));
  revalidatePath(`/dasbor/acara/${eventId}`, "layout");
  return { ok: true, message: "Template disimpan." };
}

export async function createBackgroundUpload(eventId: string, contentType: string, size: number) {
  await getOwnedEvent(eventId);
  if (!["image/png", "image/jpeg"].includes(contentType)) return { error: "Format harus PNG atau JPG." };
  if (size > MAX_BACKGROUND_BYTES) return { error: "Ukuran maksimal 5 MB." };
  if ((await certificateCount(eventId)) > 0) return { error: "Template terkunci karena sudah ada sertifikat terbit." };
  const ext = contentType === "image/png" ? "png" : "jpg";
  const key = `events/${eventId}/background-${randomSuffix(6)}.${ext}`;
  return { key, url: await storage().signedPutUrl(key, contentType, 600) };
}

export async function confirmBackground(eventId: string, key: string): Promise<FormState> {
  const { template, db: database } = await getOwnedEvent(eventId);
  if (!key.startsWith(`events/${eventId}/background-`)) return { message: "Kunci file tidak valid." };
  if ((await certificateCount(eventId)) > 0) return { message: "Template terkunci karena sudah ada sertifikat terbit." };
  const bytes = await storage().get(key);
  const fail = async (message: string) => {
    await storage().delete(key);
    return { message };
  };
  if (!bytes) return { message: "File belum terunggah. Coba lagi." };
  if (bytes.byteLength > MAX_BACKGROUND_BYTES) return fail("Ukuran maksimal 5 MB.");

  let dims: { width?: number; height?: number; type?: string };
  try {
    dims = imageSize(bytes);
  } catch {
    return fail("File bukan gambar PNG/JPG yang valid.");
  }
  const type = dims.type === "png" ? "png" : dims.type === "jpg" ? "jpg" : null;
  if (!type || !dims.width || !dims.height) return fail("File bukan gambar PNG/JPG yang valid.");
  if (dims.width < 600 && dims.height < 600) return fail("Resolusi terlalu kecil. Gunakan minimal 1200 px di sisi panjang.");

  const { widthPt, heightPt } = pageSizeFor(dims.width, dims.height);
  // Keep placed fields proportionally in place when the page size changes; a blank
  // template starts with a sensible layout so nobody faces an empty canvas.
  const sx = widthPt / template.widthPt;
  const sy = heightPt / template.heightPt;
  const fields = template.fields.length
    ? template.fields.map((f) => ({ ...f, x: f.x * sx, y: f.y * sy, w: f.w * sx }))
    : defaultLayout(widthPt, heightPt);

  await database
    .update(templates)
    .set({ backgroundKey: key, backgroundType: type, preset: null, widthPt, heightPt, fields })
    .where(eq(templates.eventId, eventId));
  if (template.backgroundKey && template.backgroundKey !== key) await storage().delete(template.backgroundKey).catch(() => {});
  revalidatePath(`/dasbor/acara/${eventId}`, "layout");
  return { ok: true };
}

export async function applyPreset(eventId: string, presetId: string): Promise<FormState> {
  const { template, db: database } = await getOwnedEvent(eventId);
  const preset = getPreset(presetId);
  if (!preset) return { message: "Template tidak dikenal." };
  if ((await certificateCount(eventId)) > 0) return { message: "Template terkunci karena sudah ada sertifikat terbit." };
  await database
    .update(templates)
    .set({
      preset: preset.id,
      backgroundKey: null,
      backgroundType: null,
      widthPt: preset.widthPt,
      heightPt: preset.heightPt,
      fields: preset.fields,
    })
    .where(eq(templates.eventId, eventId));
  if (template.backgroundKey) await storage().delete(template.backgroundKey).catch(() => {});
  revalidatePath(`/dasbor/acara/${eventId}`, "layout");
  return { ok: true };
}

// ---------------------------------------------------------------- form fields

const formFieldSchema = z.object({
  label: z.string().trim().min(1, "Label wajib diisi.").max(60),
  type: z.enum(["text", "email", "select", "number"]),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(80)).max(30),
});

export async function saveFormFields(eventId: string, input: unknown): Promise<FormState> {
  const { db: database } = await getOwnedEvent(eventId);
  if ((await certificateCount(eventId)) > 0) {
    return { message: "Form terkunci karena sudah ada peserta. Duplikat acara untuk mengubah form." };
  }
  const parsed = z.array(formFieldSchema).max(15).safeParse(input);
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Data form tidak valid." };
  const reserved = new Set<string>([...BUILTIN_KEYS, "name", "email"]);
  const used = new Set<string>();
  const rows: (typeof formFields.$inferInsert)[] = [];
  for (const [i, f] of parsed.data.entries()) {
    if (f.type === "select" && f.options.length < 2) return { message: `"${f.label}": pilihan minimal 2 opsi.` };
    let key = fieldKey(f.label);
    if (reserved.has(key)) key = `${key}_2`;
    while (used.has(key)) key = `${key}_${i}`;
    used.add(key);
    rows.push({ eventId, key, label: f.label, type: f.type, required: f.required, options: f.type === "select" ? f.options : [], position: i });
  }
  await database.transaction(async (tx) => {
    await tx.delete(formFields).where(eq(formFields.eventId, eventId));
    if (rows.length) await tx.insert(formFields).values(rows);
    // Drop template placements of custom fields that no longer exist.
    const [t] = await tx.select().from(templates).where(eq(templates.eventId, eventId));
    const fields = t.fields.filter((f) => (BUILTIN_KEYS as readonly string[]).includes(f.key) || used.has(f.key));
    if (fields.length !== t.fields.length) await tx.update(templates).set({ fields }).where(eq(templates.eventId, eventId));
  });
  revalidatePath(`/dasbor/acara/${eventId}`, "layout");
  return { ok: true, message: "Form disimpan." };
}

// ---------------------------------------------------------------- certificates

async function getOwnedCertificate(certificateId: string) {
  const organizer = await requireOrganizer();
  const database = await db();
  const [row] = await database
    .select({ cert: certificates, eventId: events.id })
    .from(certificates)
    .innerJoin(submissions, eq(submissions.id, certificates.submissionId))
    .innerJoin(events, eq(events.id, submissions.eventId))
    .where(and(eq(certificates.id, certificateId), eq(events.organizerId, organizer.id)));
  if (!row) throw new Error("Not found");
  return { ...row, db: database };
}

export async function resendCertificate(certificateId: string): Promise<FormState> {
  const { cert, eventId, db: database } = await getOwnedCertificate(certificateId);
  if (cert.status === "revoked") return { message: "Sertifikat sudah dicabut." };
  if (!cert.pdfKey && !(await issuePdf(database, certificateId))) return { message: "PDF gagal dibuat. Coba lagi." };
  await emailCertificate(database, certificateId);
  revalidatePath(`/dasbor/acara/${eventId}/peserta`);
  const [after_] = await database.select({ s: certificates.emailStatus }).from(certificates).where(eq(certificates.id, certificateId));
  if (after_.s === "failed") return { message: "Email gagal dikirim. Periksa kuota email harian." };
  return { ok: true, message: after_.s === "skipped" ? "Email tidak dikonfigurasi (mode lokal)." : "Sertifikat dikirim ulang." };
}

export async function setCertificateStatus(certificateId: string, status: "valid" | "revoked"): Promise<FormState> {
  const { eventId, db: database } = await getOwnedCertificate(certificateId);
  await database.update(certificates).set({ status }).where(eq(certificates.id, certificateId));
  revalidatePath(`/dasbor/acara/${eventId}`, "layout");
  return { ok: true };
}

/** Removes a participant entirely (e.g. a misspelled name) so they can submit again with the same email. */
export async function deleteParticipant(certificateId: string): Promise<FormState> {
  const { cert, eventId, db: database } = await getOwnedCertificate(certificateId);
  await database.delete(submissions).where(eq(submissions.id, cert.submissionId));
  if (cert.pdfKey) await storage().delete(cert.pdfKey).catch(() => {});
  revalidatePath(`/dasbor/acara/${eventId}`, "layout");
  return { ok: true, message: "Entri dihapus. Peserta bisa mengisi form lagi dengan email yang sama." };
}

export async function retryCertificatePdf(certificateId: string): Promise<FormState> {
  const { eventId, db: database, cert } = await getOwnedCertificate(certificateId);
  const ok = await issuePdf(database, certificateId);
  if (ok && cert.emailStatus !== "sent") after(() => emailCertificate(database, certificateId));
  revalidatePath(`/dasbor/acara/${eventId}`, "layout");
  return ok ? { ok: true, message: "PDF berhasil dibuat." } : { message: "PDF masih gagal dibuat." };
}
