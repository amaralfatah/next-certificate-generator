// Pure participant-form rules shared by the public form (client) and the submit service.
import { MAX_NAME_LENGTH } from "@/lib/pdf/layout";

export const QUESTION_TYPES = ["short_text", "paragraph", "radio", "checkbox", "dropdown", "date", "time", "scale", "number", "email"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Jawaban singkat",
  paragraph: "Paragraf",
  radio: "Pilihan ganda",
  checkbox: "Kotak centang",
  dropdown: "Dropdown",
  date: "Tanggal",
  time: "Waktu",
  scale: "Skala linear",
  number: "Angka",
  email: "Email",
};

/** Types whose options come from the organizer's list. */
export const CHOICE_TYPES: readonly QuestionType[] = ["radio", "checkbox", "dropdown"];
/** Types that fit on one certificate line, so they can be placed on the template. */
export const PRINTABLE_TYPES: readonly QuestionType[] = ["short_text", "radio", "dropdown", "date", "number"];

export type QuestionConfig = { min: number; max: number; minLabel?: string; maxLabel?: string };
export const DEFAULT_SCALE: QuestionConfig = { min: 1, max: 5 };

export type Answers = Record<string, string | string[]>;

export type FieldDef = {
  key: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  role?: "name" | "email" | null;
  help?: string;
  config?: QuestionConfig | null;
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_ANSWER_LENGTH = 200;
export const MAX_PARAGRAPH_LENGTH = 2000;

export type FieldErrors = Record<string, string>;

/** Collapses whitespace; participants often paste names with double spaces. */
export const cleanName = (s: string) => s.replace(/\s+/g, " ").trim();

/** An answer as one line of text: checkbox selections joined, for the certificate, CSV and tables. */
export const answerText = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(", ") : (v ?? ""));

/** Placeholder answer for certificate previews in the dashboard. */
export function sampleAnswer(f: Pick<FieldDef, "type" | "label" | "options">) {
  if (CHOICE_TYPES.includes(f.type)) return f.options[0] ?? f.label;
  if (f.type === "date") return "2026-10-24";
  if (f.type === "number") return "42";
  return f.label;
}

function checkAnswer(f: FieldDef, v: string): string | null {
  if (v.length > (f.type === "paragraph" ? MAX_PARAGRAPH_LENGTH : MAX_ANSWER_LENGTH)) {
    return `Maksimal ${f.type === "paragraph" ? MAX_PARAGRAPH_LENGTH : MAX_ANSWER_LENGTH} karakter.`;
  }
  switch (f.type) {
    case "number":
      return /^-?\d+([.,]\d+)?$/.test(v) ? null : "Harus berupa angka.";
    case "email":
      return EMAIL_RE.test(v) ? null : "Format email tidak valid.";
    case "radio":
    case "dropdown":
      return f.options.includes(v) ? null : "Pilih salah satu opsi.";
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? null : "Tanggal tidak valid.";
    case "time":
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? null : "Waktu tidak valid.";
    case "scale": {
      const { min, max } = f.config ?? DEFAULT_SCALE;
      const n = Number(v);
      return /^\d+$/.test(v) && n >= min && n <= max ? null : "Pilih salah satu angka.";
    }
    default:
      return null;
  }
}

export function validateSubmission(fields: FieldDef[], input: { name: string; email: string; answers: Answers }) {
  const errors: FieldErrors = {};
  const name = cleanName(input.name ?? "");
  const email = (input.email ?? "").trim().toLowerCase();

  if (!name) errors.name = "Nama wajib diisi.";
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Nama maksimal ${MAX_NAME_LENGTH} karakter.`;
  if (!email) errors.email = "Email wajib diisi.";
  else if (!EMAIL_RE.test(email) || email.length > 254) errors.email = "Format email tidak valid.";

  const answers: Answers = {};
  for (const f of fields) {
    // Name and email arrive as their own fields and are stored in their own columns.
    if (f.role) continue;
    const raw = input.answers?.[f.key];
    if (f.type === "checkbox") {
      const picked = [...new Set((Array.isArray(raw) ? raw : raw ? [raw] : []).map((x) => String(x).trim()).filter(Boolean))];
      if (!picked.length) {
        if (f.required) errors[f.key] = `${f.label} wajib diisi.`;
        continue;
      }
      if (picked.some((x) => !f.options.includes(x))) errors[f.key] = "Pilih dari opsi yang tersedia.";
      // Keep the organizer's option order, not the click order.
      answers[f.key] = f.options.filter((o) => picked.includes(o));
      continue;
    }
    const v = (Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "")).trim();
    if (!v) {
      if (f.required) errors[f.key] = `${f.label} wajib diisi.`;
      continue;
    }
    const err = checkAnswer(f, v);
    if (err) errors[f.key] = err;
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
