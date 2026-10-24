"use server";

import { and, count, eq } from "drizzle-orm";
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
import { CHOICE_TYPES, DEFAULT_SCALE, fieldKey, PRINTABLE_TYPES, QUESTION_TYPES } from "@/lib/forms";
import { fromLocalInput } from "@/lib/i18n";
import { defaultLayout, pageSizeFor } from "@/lib/pdf/layout";
import { getPreset } from "@/lib/pdf/presets";
import { BUILTIN_KEYS } from "@/lib/pdf/types";
import { createFormFor, prefixTaken, ROLE_QUESTIONS } from "@/lib/new-form";
import { hashCode } from "@/lib/security/crypto";
import { eventSlug, PREFIX_RE, randomSuffix } from "@/lib/slug";
import { storage } from "@/lib/storage";

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string> } | undefined;
export type SaveQuestionsResult = FormState & { keys?: string[] };

const MAX_BACKGROUND_BYTES = 5 * 1024 * 1024;

function zodErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

const headerSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi.").max(120, "Maksimal 120 karakter."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi."),
  endDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Tanggal selesai tidak valid.")
    .nullish()
    .transform((v) => v || null),
  organizerLabel: z.string().trim().min(2, "Nama penyelenggara wajib diisi.").max(120, "Maksimal 120 karakter."),
  description: z.string().trim().max(1000, "Maksimal 1000 karakter.").default(""),
});

const prefixSchema = z.object({
  numberPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PREFIX_RE, "Gunakan 2 sampai 8 huruf kapital atau angka, tanpa spasi."),
});

async function certificateCount(eventId: string) {
  const [{ n }] = await (await db())
    .select({ n: count() })
    .from(submissions)
    .where(eq(submissions.eventId, eventId));
  return n;
}

// ---------------------------------------------------------------- events

/** "Formulir baru" creates a ready-to-share form at once: name and email questions and a built-in certificate design. */
export async function createForm() {
  const organizer = await requireOrganizer();
  const id = await createFormFor(organizer);
  revalidatePath("/forms");
  redirect(`/forms/${id}`);
}

/** Autosaved from the header card on the Pertanyaan tab. */
export async function saveFormHeader(eventId: string, input: unknown): Promise<FormState> {
  const { event, db: database } = await getOwnedEvent(eventId);
  const parsed = headerSchema.safeParse(input);
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  if (d.endDate && d.endDate <= d.date) return { errors: { endDate: "Tanggal selesai harus setelah tanggal mulai." } };
  if (d.date.slice(0, 4) !== event.date.slice(0, 4) && (await certificateCount(eventId)) > 0) {
    return { errors: { date: "Tahun acara tidak bisa diubah setelah ada respons (tahun masuk ke nomor sertifikat)." } };
  }
  // A draft's link has not been shared yet, so it can still follow the title.
  const slug = event.status === "draft" && d.title !== event.title ? eventSlug(d.title) : event.slug;
  await database.update(events).set({ ...d, slug }).where(eq(events.id, eventId));
  revalidatePath(`/forms/${eventId}`, "layout");
  return { ok: true };
}

export async function updateNumberPrefix(eventId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { event, db: database } = await getOwnedEvent(eventId);
  const parsed = prefixSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const { numberPrefix } = parsed.data;
  if (numberPrefix === event.numberPrefix) return { ok: true, message: "Awalan nomor disimpan." };
  if ((await certificateCount(eventId)) > 0) return { errors: { numberPrefix: "Awalan tidak bisa diubah setelah ada respons." } };
  if (await prefixTaken(numberPrefix, eventId)) return { errors: { numberPrefix: "Awalan ini sudah dipakai formulir lain." } };
  await database.update(events).set({ numberPrefix }).where(eq(events.id, eventId));
  revalidatePath(`/forms/${eventId}`, "layout");
  return { ok: true, message: "Awalan nomor disimpan." };
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
  revalidatePath(`/forms/${eventId}`, "layout");
  return { ok: true, message: "Setelan disimpan." };
}

/** Draft → open (Bagikan) and open ⇄ closed (Menerima respons). A shared form never goes back to draft. */
export async function setEventStatus(eventId: string, status: "open" | "closed"): Promise<FormState> {
  const { template, db: database } = await getOwnedEvent(eventId);
  if (status === "open") {
    const blockers = publishBlockers(template);
    if (blockers.length) return { message: blockers.join(" ") };
  }
  await database.update(events).set({ status }).where(eq(events.id, eventId));
  revalidatePath(`/forms/${eventId}`, "layout");
  revalidatePath("/forms");
  return { ok: true };
}

export async function deleteEvent(eventId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { event, template, db: database } = await getOwnedEvent(eventId);
  if (String(formData.get("confirm") ?? "").trim() !== event.title) {
    return { errors: { confirm: "Ketik judul formulir persis untuk mengonfirmasi." } };
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
  revalidatePath("/forms");
  redirect("/forms");
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
        endDate: event.endDate,
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
  revalidatePath("/forms");
  redirect(`/forms/${newId}`);
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
    return { message: "Desain sertifikat terkunci karena sudah ada respons. Duplikat formulir untuk memakai desain lain." };
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
  revalidatePath(`/forms/${eventId}`, "layout");
  return { ok: true, message: "Template disimpan." };
}

export async function createBackgroundUpload(eventId: string, contentType: string, size: number) {
  await getOwnedEvent(eventId);
  if (!["image/png", "image/jpeg"].includes(contentType)) return { error: "Format harus PNG atau JPG." };
  if (size > MAX_BACKGROUND_BYTES) return { error: "Ukuran maksimal 5 MB." };
  if ((await certificateCount(eventId)) > 0) return { error: "Desain sertifikat terkunci karena sudah ada respons." };
  const ext = contentType === "image/png" ? "png" : "jpg";
  const key = `events/${eventId}/background-${randomSuffix(6)}.${ext}`;
  return { key, url: await storage().signedPutUrl(key, contentType, 600) };
}

export async function confirmBackground(eventId: string, key: string): Promise<FormState> {
  const { template, db: database } = await getOwnedEvent(eventId);
  if (!key.startsWith(`events/${eventId}/background-`)) return { message: "Kunci file tidak valid." };
  if ((await certificateCount(eventId)) > 0) return { message: "Desain sertifikat terkunci karena sudah ada respons." };
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
  revalidatePath(`/forms/${eventId}`, "layout");
  return { ok: true };
}

export async function applyPreset(eventId: string, presetId: string): Promise<FormState> {
  const { template, db: database } = await getOwnedEvent(eventId);
  const preset = getPreset(presetId);
  if (!preset) return { message: "Template tidak dikenal." };
  if ((await certificateCount(eventId)) > 0) return { message: "Desain sertifikat terkunci karena sudah ada respons." };
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
  revalidatePath(`/forms/${eventId}`, "layout");
  return { ok: true };
}

// ---------------------------------------------------------------- form fields

const questionSchema = z.object({
  key: z.string().max(40).optional(),
  label: z.string().trim().min(1, "Setiap pertanyaan perlu teks.").max(200, "Teks pertanyaan maksimal 200 karakter."),
  help: z.string().trim().max(300).default(""),
  type: z.enum(QUESTION_TYPES),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1, "Opsi tidak boleh kosong.").max(100)).max(50).default([]),
  config: z
    .object({ min: z.number().int().min(0).max(1), max: z.number().int().min(2).max(10), minLabel: z.string().trim().max(40).optional(), maxLabel: z.string().trim().max(40).optional() })
    .nullable()
    .optional(),
});

/**
 * Saves the whole question list. Keys are stable once created, so editing a question's
 * text never disconnects the answers already stored under it.
 */
export async function saveQuestions(eventId: string, input: unknown): Promise<SaveQuestionsResult> {
  const { template, db: database } = await getOwnedEvent(eventId);
  const parsed = z.array(questionSchema).max(40, "Maksimal 40 pertanyaan.").safeParse(input);
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Data pertanyaan tidak valid." };
  const existing = await database.select().from(formFields).where(eq(formFields.eventId, eventId));
  const byKey = new Map(existing.map((f) => [f.key, f]));
  const hasResponses = (await certificateCount(eventId)) > 0;
  const placed = new Set(template.fields.map((f) => f.key));

  const reserved = new Set<string>([...BUILTIN_KEYS, "name", "email", "attendanceCode"]);
  const used = new Set<string>();
  const rows: (typeof formFields.$inferInsert)[] = [];
  for (const [i, q] of parsed.data.entries()) {
    const old = q.key ? byKey.get(q.key) : undefined;
    const label = q.label;
    if (old?.role) {
      // Name and email keep their role, type and required flag; only the wording and position change.
      rows.push({ ...old, id: undefined, label, help: q.help, position: i });
      used.add(old.key);
      continue;
    }
    if (CHOICE_TYPES.includes(q.type) && q.options.length < 1) return { message: `"${label}": tambahkan minimal 1 opsi.` };
    if (new Set(q.options).size !== q.options.length) return { message: `"${label}": ada opsi yang sama.` };
    if (old && hasResponses && placed.has(old.key) && old.type !== q.type) {
      return { message: `"${old.label}" dipakai di sertifikat, jadi jenisnya tidak bisa diganti setelah ada respons.` };
    }
    let key = old?.key;
    if (!key) {
      const base = fieldKey(label);
      key = base;
      for (let n = 2; reserved.has(key) || used.has(key) || byKey.has(key); n++) key = `${base.slice(0, 28)}_${n}`;
    }
    used.add(key);
    rows.push({
      eventId,
      key,
      label,
      help: q.help,
      type: q.type,
      role: null,
      required: q.required,
      options: CHOICE_TYPES.includes(q.type) ? q.options : [],
      config: q.type === "scale" ? (q.config ?? DEFAULT_SCALE) : null,
      position: i,
    });
  }
  for (const r of ROLE_QUESTIONS) if (!used.has(r.key)) return { message: `Pertanyaan "${byKey.get(r.key)?.label ?? r.label}" tidak bisa dihapus.` };
  if (hasResponses) {
    const removed = existing.find((f) => !used.has(f.key) && placed.has(f.key));
    if (removed) return { message: `"${removed.label}" dipakai di sertifikat, jadi tidak bisa dihapus setelah ada respons.` };
  }

  await database.transaction(async (tx) => {
    await tx.delete(formFields).where(eq(formFields.eventId, eventId));
    await tx.insert(formFields).values(rows.map(({ id: _id, ...r }) => r));
    if (!hasResponses) {
      // Drop placements of questions that are gone or no longer fit on one certificate line.
      const printable = new Set(rows.filter((r) => PRINTABLE_TYPES.includes(r.type)).map((r) => r.key));
      const fields = template.fields.filter((f) => (BUILTIN_KEYS as readonly string[]).includes(f.key) || printable.has(f.key));
      if (fields.length !== template.fields.length) await tx.update(templates).set({ fields }).where(eq(templates.eventId, eventId));
    }
  });
  revalidatePath(`/forms/${eventId}`, "layout");
  // New questions get their key here; the editor keeps it so the next save updates instead of re-creating them.
  return { ok: true, keys: rows.map((r) => r.key) };
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
  revalidatePath(`/forms/${eventId}/responses`);
  const [after_] = await database.select({ s: certificates.emailStatus }).from(certificates).where(eq(certificates.id, certificateId));
  if (after_.s === "failed") return { message: "Email gagal dikirim. Periksa kuota email harian." };
  return { ok: true, message: after_.s === "skipped" ? "Email tidak dikonfigurasi (mode lokal)." : "Sertifikat dikirim ulang." };
}

export async function setCertificateStatus(certificateId: string, status: "valid" | "revoked"): Promise<FormState> {
  const { eventId, db: database } = await getOwnedCertificate(certificateId);
  await database.update(certificates).set({ status }).where(eq(certificates.id, certificateId));
  revalidatePath(`/forms/${eventId}`, "layout");
  return { ok: true };
}

/** Removes a participant entirely (e.g. a misspelled name) so they can submit again with the same email. */
export async function deleteParticipant(certificateId: string): Promise<FormState> {
  const { cert, eventId, db: database } = await getOwnedCertificate(certificateId);
  await database.delete(submissions).where(eq(submissions.id, cert.submissionId));
  if (cert.pdfKey) await storage().delete(cert.pdfKey).catch(() => {});
  revalidatePath(`/forms/${eventId}`, "layout");
  return { ok: true, message: "Entri dihapus. Peserta bisa mengisi form lagi dengan email yang sama." };
}

export async function retryCertificatePdf(certificateId: string): Promise<FormState> {
  const { eventId, db: database, cert } = await getOwnedCertificate(certificateId);
  const ok = await issuePdf(database, certificateId);
  if (ok && cert.emailStatus !== "sent") after(() => emailCertificate(database, certificateId));
  revalidatePath(`/forms/${eventId}`, "layout");
  return ok ? { ok: true, message: "PDF berhasil dibuat." } : { message: "PDF masih gagal dibuat." };
}
