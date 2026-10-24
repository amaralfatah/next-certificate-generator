// v1 ships Indonesian only. Locale-dependent formatting goes through here so adding a
// second language later means swapping these helpers, not hunting through components.
export const LOCALE = "id-ID";
export const TIME_ZONE = "Asia/Jakarta";

const utcDate = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { ...opts, timeZone: "UTC" });

/**
 * `2026-10-09` -> `9 Oktober 2026` (calendar date, no time zone shift). With an end date it
 * becomes a range that repeats only what differs: `24–26 Oktober 2026`,
 * `30 Oktober – 2 November 2026`, `30 Desember 2026 – 2 Januari 2027`.
 */
export function formatEventDate(isoDate: string, endIsoDate?: string | null) {
  const start = utcDate(isoDate);
  const full = fmt({ day: "numeric", month: "long", year: "numeric" });
  if (!endIsoDate || endIsoDate <= isoDate) return full.format(start);
  const end = utcDate(endIsoDate);
  if (start.getUTCFullYear() !== end.getUTCFullYear()) return `${full.format(start)} – ${full.format(end)}`;
  if (start.getUTCMonth() !== end.getUTCMonth()) return `${fmt({ day: "numeric", month: "long" }).format(start)} – ${full.format(end)}`;
  return `${start.getUTCDate()}–${full.format(end)}`;
}

/** A moment as a WIB calendar date: `25 Oktober 2026`. */
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "long", timeZone: TIME_ZONE }).format(date);
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

/** Today's calendar date in WIB, as yyyy-mm-dd. */
export function todayInJakarta(now = new Date()) {
  return toLocalInput(now).slice(0, 10);
}
