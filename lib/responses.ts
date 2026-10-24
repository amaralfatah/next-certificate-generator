// Per-question summary for the Respons tab. Pure, so it can be tested without a database.
import { type Answers, CHOICE_TYPES, DEFAULT_SCALE, type FieldDef } from "@/lib/forms";

export type QuestionSummary =
  | { kind: "counts"; field: FieldDef; answered: number; buckets: { label: string; count: number }[] }
  | { kind: "list"; field: FieldDef; answered: number; latest: string[] };

export const LATEST_LIMIT = 10;

/**
 * `responses` are oldest first. Answers that no longer match the question (an option
 * renamed or removed, a type changed) are left out of the counts rather than guessed at.
 */
export function summarize(fields: FieldDef[], responses: Answers[]): QuestionSummary[] {
  return fields
    .filter((f) => !f.role)
    .map((field): QuestionSummary => {
      const values = responses.map((r) => r[field.key]).filter((v) => v !== undefined && v !== "" && !(Array.isArray(v) && !v.length));
      if (CHOICE_TYPES.includes(field.type) || field.type === "scale") {
        const labels =
          field.type === "scale"
            ? range((field.config ?? DEFAULT_SCALE).min, (field.config ?? DEFAULT_SCALE).max).map(String)
            : field.options;
        const counts = new Map(labels.map((l) => [l, 0]));
        let answered = 0;
        for (const v of values) {
          const picked = (Array.isArray(v) ? v : [v]).filter((x) => counts.has(x));
          if (!picked.length) continue;
          answered++;
          for (const x of picked) counts.set(x, counts.get(x)! + 1);
        }
        return { kind: "counts", field, answered, buckets: labels.map((label) => ({ label, count: counts.get(label)! })) };
      }
      const texts = values.map((v) => (Array.isArray(v) ? v.join(", ") : v));
      return { kind: "list", field, answered: texts.length, latest: texts.slice(-LATEST_LIMIT).reverse() };
    });
}

function range(min: number, max: number) {
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
}
