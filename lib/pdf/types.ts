import type { CertFontId } from "@/lib/fonts";

/**
 * A field placed on the template. All coordinates are PDF points measured from the
 * top-left corner of the page, so the editor and the PDF agree at any screen size.
 *
 * Text fields: `x`/`w` give the horizontal box, `y` is the vertical centre of the line.
 * QR field: `x`/`y` is the top-left corner and `w` the side of the square.
 */
export type TemplateField = {
  key: string; // nama | acara | tanggal | nomor | qr | penyelenggara | custom form key
  x: number;
  y: number;
  w: number;
  font: CertFontId;
  size: number;
  color: string; // #rrggbb
  align: "left" | "center" | "right";
};

export const BUILTIN_KEYS = ["nama", "acara", "tanggal", "nomor", "penyelenggara", "qr"] as const;

export const BUILTIN_LABELS: Record<(typeof BUILTIN_KEYS)[number], string> = {
  nama: "Nama peserta",
  acara: "Nama acara",
  tanggal: "Tanggal acara",
  nomor: "Nomor sertifikat",
  penyelenggara: "Penyelenggara",
  qr: "QR verifikasi",
};
