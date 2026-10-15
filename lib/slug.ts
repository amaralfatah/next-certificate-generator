import { randomBytes } from "node:crypto";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomSuffix(len = 4) {
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 40)
    .replace(/-+$/, "");
}

export const eventSlug = (title: string) => `${slugify(title) || "acara"}-${randomSuffix()}`;

/** "Webinar Literasi Digital" -> "WLD" */
export function suggestPrefix(title: string) {
  const initials = slugify(title)
    .split("-")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return (initials.length >= 2 ? initials : (initials + "PG")).slice(0, 5);
}

export const PREFIX_RE = /^[A-Z0-9]{2,8}$/;
