// Pure participant-form rules shared by the public form (client) and the submit service.
import { MAX_NAME_LENGTH } from "@/lib/pdf/layout";

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "email" | "select" | "number";
  required: boolean;
  options: string[];
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_ANSWER_LENGTH = 200;

export type FieldErrors = Record<string, string>;

/** Collapses whitespace; participants often paste names with double spaces. */
export const cleanName = (s: string) => s.replace(/\s+/g, " ").trim();

export function validateSubmission(
  fields: FieldDef[],
  input: { name: string; email: string; answers: Record<string, string> },
) {
  const errors: FieldErrors = {};
  const name = cleanName(input.name ?? "");
  const email = (input.email ?? "").trim().toLowerCase();

  if (!name) errors.name = "Nama wajib diisi.";
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Nama maksimal ${MAX_NAME_LENGTH} karakter.`;
  if (!email) errors.email = "Email wajib diisi.";
  else if (!EMAIL_RE.test(email) || email.length > 254) errors.email = "Format email tidak valid.";

  const answers: Record<string, string> = {};
  for (const f of fields) {
    const v = (input.answers?.[f.key] ?? "").trim();
    if (!v) {
      if (f.required) errors[f.key] = `${f.label} wajib diisi.`;
      continue;
    }
    if (v.length > MAX_ANSWER_LENGTH) errors[f.key] = `Maksimal ${MAX_ANSWER_LENGTH} karakter.`;
    else if (f.type === "number" && !/^-?\d+([.,]\d+)?$/.test(v)) errors[f.key] = "Harus berupa angka.";
    else if (f.type === "email" && !EMAIL_RE.test(v)) errors[f.key] = "Format email tidak valid.";
    else if (f.type === "select" && !f.options.includes(v)) errors[f.key] = "Pilih salah satu opsi.";
    answers[f.key] = v;
  }

  return { ok: Object.keys(errors).length === 0, errors, value: { name, email, answers } };
}

export type Availability = "open" | "draft" | "not_yet" | "closed" | "full";

export function formAvailability(
  e: { status: string; opensAt: Date | null; closesAt: Date | null; quota: number | null },
  issued: number,
  now = new Date(),
): Availability {
  if (e.status === "draft") return "draft";
  if (e.status === "closed") return "closed";
  if (e.opensAt && now < e.opensAt) return "not_yet";
  if (e.closesAt && now >= e.closesAt) return "closed";
  if (e.quota != null && issued >= e.quota) return "full";
  return "open";
}

/** `Kota asal` -> `kota_asal`; used for custom field keys and template placeholders. */
export function fieldKey(label: string) {
  return (
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 32) || "kolom"
  );
}
