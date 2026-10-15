// v1 ships Indonesian only. Locale-dependent formatting goes through here so adding a
// second language later means swapping these helpers, not hunting through components.
export const LOCALE = "id-ID";
export const TIME_ZONE = "Asia/Jakarta";

/** `2026-10-09` -> `9 Oktober 2026` (calendar date, no time zone shift). */
export function formatEventDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE }).format(date);
}

/** Value for <input type="datetime-local">, in WIB. */
export function toLocalInput(date: Date | null) {
  if (!date) return "";
  const wib = new Date(date.getTime() + 7 * 3600_000);
  return wib.toISOString().slice(0, 16);
}

/** Parses a datetime-local value entered in WIB (UTC+7, no DST). */
export function fromLocalInput(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(`${value}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat(LOCALE).format(n);
}
