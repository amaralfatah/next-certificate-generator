import type { TemplateField } from "./types";

// Pure layout helpers shared by the PDF renderer, the editor preview and the tests.

export const MAX_NAME_LENGTH = 80;
export const MIN_FONT_SIZE = 6;

/** Shrinks `size` in 0.5pt steps until `measure(size)` fits inside `maxWidth`. */
export function fitFontSize(measure: (size: number) => number, size: number, maxWidth: number) {
  let s = size;
  while (s > MIN_FONT_SIZE && measure(s) > maxWidth) s -= 0.5;
  return Math.max(s, MIN_FONT_SIZE);
}

/** Left edge of a line of `textWidth` aligned inside the box [x, x + w]. */
export function alignX(align: "left" | "center" | "right", x: number, w: number, textWidth: number) {
  if (align === "center") return x + (w - textWidth) / 2;
  if (align === "right") return x + w - textWidth;
  return x;
}

/** `WBN-2026-00042` */
export function formatCertificateNumber(prefix: string, year: number, seq: number) {
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}

/**
 * Known page formats (landscape, in points). Certificates are usually designed as a
 * PowerPoint/Canva slide (16:9) or on A4 paper, so a background whose ratio matches one
 * of these gets that exact page size.
 */
export const PAGE_FORMATS = [
  { name: "Slide 16:9 (PowerPoint)", w: 960, h: 540 },
  { name: "Slide 4:3", w: 720, h: 540 },
  { name: "A4", w: 841.89, h: 595.28 },
  { name: "Letter", w: 792, h: 612 },
] as const;

/**
 * Page size in points for a background image. Matches a known format when the ratio is
 * within 2%; otherwise the long side is A4's (842pt) and the short side keeps the ratio.
 */
export function pageSizeFor(imageWidth: number, imageHeight: number) {
  const landscape = imageWidth >= imageHeight;
  const ratio = landscape ? imageWidth / imageHeight : imageHeight / imageWidth;
  const known = PAGE_FORMATS.find((f) => Math.abs(f.w / f.h - ratio) / ratio < 0.02);
  const long = known?.w ?? 842;
  const short = known?.h ?? round2(842 / ratio);
  return landscape ? { widthPt: long, heightPt: short } : { widthPt: short, heightPt: long };
}

/** Human label for a page size, e.g. "Slide 16:9 (PowerPoint)". */
export function pageFormatName(widthPt: number, heightPt: number) {
  const [l, s] = widthPt >= heightPt ? [widthPt, heightPt] : [heightPt, widthPt];
  return PAGE_FORMATS.find((f) => Math.abs(f.w - l) < 1 && Math.abs(f.h - s) < 1)?.name ?? "Ukuran kustom";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Starting position for a field added to a template of size W × H. */
export function defaultField(key: string, W: number, H: number): TemplateField {
  const base = { key, x: W * 0.15, w: W * 0.7, color: "#1c2a3a", align: "center" as const };
  switch (key) {
    case "nama":
      return { ...base, y: H * 0.46, font: "great-vibes-400", size: 44 };
    case "acara":
      return { ...base, y: H * 0.6, font: "playfair-display-700", size: 18 };
    case "tanggal":
      return { ...base, y: H * 0.67, font: "montserrat-400", size: 11 };
    case "penyelenggara":
      return { ...base, y: H * 0.74, font: "montserrat-700", size: 11 };
    case "nomor":
      return { ...base, x: W * 0.06, y: H * 0.93, w: W * 0.32, font: "montserrat-400", size: 8, align: "left" };
    case "qr": {
      const s = Math.round(Math.min(W, H) * 0.12);
      return { ...base, x: W - W * 0.06 - s, y: H - H * 0.06 - s, w: s, font: "montserrat-400", size: 10, color: "#000000" };
    }
    default:
      return { ...base, y: H * 0.53, font: "montserrat-400", size: 13 };
  }
}

/** The layout an uploaded design starts with: name, event, date, number and QR. */
export function defaultLayout(W: number, H: number) {
  return ["nama", "acara", "tanggal", "nomor", "qr"].map((k) => defaultField(k, W, H));
}

export function hexToRgb01(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const v = m ? parseInt(m[1], 16) : 0;
  return { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 };
}
