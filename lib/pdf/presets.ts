import type { CertFontId } from "@/lib/fonts";
import type { TemplateField } from "./types";

/**
 * Built-in certificate designs, drawn as vectors so they are razor-sharp in the PDF and
 * need no image upload. The same shape list is rendered to SVG in the editor and to
 * pdf-lib drawing calls in the PDF. Coordinates are points from the top-left corner.
 * Page size is a 16:9 slide (960 × 540 pt), the format most certificates are designed in.
 */
export type Shape =
  | { t: "rect"; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { t: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number; opacity?: number }
  | { t: "path"; d: string; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | {
      t: "text";
      x: number;
      y: number; // vertical centre of the line, like template fields
      w: number;
      text: string;
      font: CertFontId;
      size: number;
      color: string;
      align: "left" | "center" | "right";
      opacity?: number;
    };

export type Preset = {
  id: string;
  name: string;
  description: string;
  widthPt: number;
  heightPt: number;
  shapes: Shape[];
  fields: TemplateField[];
};

const W = 960;
const H = 540;

const NAVY = "#1c2a3a";
const GOLD = "#b8924a";
const IVORY = "#fbf7ee";

const diamond = (cx: number, cy: number, r: number) => `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`;

const klasik: Preset = {
  id: "klasik",
  name: "Klasik",
  description: "Bingkai navy dan garis emas. Resmi, cocok untuk seminar dan pelatihan.",
  widthPt: W,
  heightPt: H,
  shapes: [
    { t: "rect", x: 0, y: 0, w: W, h: H, fill: NAVY },
    { t: "rect", x: 26, y: 26, w: W - 52, h: H - 52, fill: IVORY },
    { t: "rect", x: 40, y: 40, w: W - 80, h: H - 80, stroke: GOLD, sw: 1.6 },
    { t: "rect", x: 46, y: 46, w: W - 92, h: H - 92, stroke: GOLD, sw: 0.6 },
    { t: "path", d: diamond(43, 43, 7), fill: GOLD },
    { t: "path", d: diamond(W - 43, 43, 7), fill: GOLD },
    { t: "path", d: diamond(43, H - 43, 7), fill: GOLD },
    { t: "path", d: diamond(W - 43, H - 43, 7), fill: GOLD },
    { t: "text", x: 0, y: 112, w: W, text: "S E R T I F I K A T", font: "cinzel-700", size: 34, color: NAVY, align: "center" },
    { t: "line", x1: 380, y1: 146, x2: 450, y2: 146, stroke: GOLD, sw: 1 },
    { t: "path", d: diamond(480, 146, 4), fill: GOLD },
    { t: "line", x1: 510, y1: 146, x2: 580, y2: 146, stroke: GOLD, sw: 1 },
    { t: "text", x: 0, y: 200, w: W, text: "diberikan kepada", font: "eb-garamond-400", size: 16, color: "#5b6472", align: "center" },
    { t: "line", x1: 290, y1: 292, x2: 670, y2: 292, stroke: GOLD, sw: 1 },
    { t: "text", x: 0, y: 324, w: W, text: "atas partisipasinya sebagai peserta dalam", font: "eb-garamond-400", size: 14, color: "#5b6472", align: "center" },
    { t: "line", x1: 390, y1: 434, x2: 570, y2: 434, stroke: "#9aa3ad", sw: 0.6 },
    { t: "text", x: 380, y: 466, w: 200, text: "Penyelenggara", font: "montserrat-400", size: 8, color: "#7a828c", align: "center" },
  ],
  fields: [
    { key: "nama", x: 130, y: 254, w: 700, font: "great-vibes-400", size: 52, color: NAVY, align: "center" },
    { key: "acara", x: 130, y: 354, w: 700, font: "playfair-display-700", size: 20, color: NAVY, align: "center" },
    { key: "tanggal", x: 130, y: 382, w: 700, font: "montserrat-400", size: 10.5, color: "#5b6472", align: "center" },
    { key: "penyelenggara", x: 330, y: 450, w: 300, font: "montserrat-700", size: 11, color: NAVY, align: "center" },
    { key: "nomor", x: 64, y: 478, w: 250, font: "montserrat-400", size: 7.5, color: "#7a828c", align: "left" },
    { key: "qr", x: 842, y: 418, w: 58, font: "montserrat-400", size: 10, color: NAVY, align: "left" },
  ],
};

const BLUE = "#16324f";
const AMBER = "#e0a43a";

const modern: Preset = {
  id: "modern",
  name: "Modern",
  description: "Panel biru tegas di kiri, tipografi bersih. Cocok untuk webinar dan perusahaan.",
  widthPt: W,
  heightPt: H,
  shapes: [
    { t: "rect", x: 0, y: 0, w: W, h: H, fill: "#ffffff" },
    { t: "rect", x: 0, y: 0, w: 300, h: H, fill: BLUE },
    { t: "circle", cx: 40, cy: 520, r: 150, fill: "#1e4166" },
    { t: "circle", cx: 230, cy: 40, r: 60, fill: "#1e4166" },
    { t: "rect", x: 300, y: 0, w: 8, h: H, fill: AMBER },
    { t: "text", x: 40, y: 104, w: 240, text: "SERTIFIKAT", font: "montserrat-700", size: 28, color: "#ffffff", align: "left" },
    { t: "text", x: 40, y: 134, w: 240, text: "P E N G H A R G A A N", font: "montserrat-400", size: 9, color: AMBER, align: "left" },
    { t: "rect", x: 34, y: 384, w: 92, h: 92, fill: "#ffffff" },
    { t: "text", x: 360, y: 168, w: 540, text: "Diberikan kepada", font: "montserrat-400", size: 13, color: "#6b7684", align: "left" },
    { t: "rect", x: 360, y: 262, w: 120, h: 4, fill: AMBER },
    { t: "text", x: 360, y: 300, w: 540, text: "Atas partisipasinya sebagai peserta dalam", font: "montserrat-400", size: 12, color: "#6b7684", align: "left" },
    { t: "line", x1: 360, y1: 436, x2: 580, y2: 436, stroke: "#d5dbe2", sw: 1 },
    { t: "text", x: 360, y: 478, w: 300, text: "Penyelenggara", font: "montserrat-400", size: 8.5, color: "#6b7684", align: "left" },
  ],
  fields: [
    { key: "nama", x: 360, y: 224, w: 560, font: "playfair-display-700", size: 42, color: BLUE, align: "left" },
    { key: "acara", x: 360, y: 330, w: 560, font: "montserrat-700", size: 18, color: "#1d2a38", align: "left" },
    { key: "tanggal", x: 360, y: 358, w: 560, font: "montserrat-400", size: 11.5, color: "#6b7684", align: "left" },
    { key: "penyelenggara", x: 360, y: 458, w: 400, font: "montserrat-700", size: 12, color: "#1d2a38", align: "left" },
    { key: "qr", x: 40, y: 390, w: 80, font: "montserrat-400", size: 10, color: BLUE, align: "left" },
    { key: "nomor", x: 40, y: 498, w: 240, font: "montserrat-400", size: 8, color: "#c9d6e3", align: "left" },
  ],
};

const INK = "#2b2d42";
const CORAL = "#e8735a";
const PEACH = "#f2b880";
const TEAL = "#3e8e7e";
const MUTE = "#6d6875";

const ceria: Preset = {
  id: "ceria",
  name: "Ceria",
  description: "Warna hangat dan bentuk lingkaran. Cocok untuk sekolah, komunitas, dan lomba.",
  widthPt: W,
  heightPt: H,
  shapes: [
    { t: "rect", x: 0, y: 0, w: W, h: H, fill: "#fff8ef" },
    { t: "circle", cx: 0, cy: 0, r: 175, fill: PEACH },
    { t: "circle", cx: 0, cy: 0, r: 120, fill: CORAL },
    { t: "circle", cx: W, cy: H, r: 190, fill: "#9fd0c4" },
    { t: "circle", cx: W, cy: H, r: 128, fill: TEAL },
    { t: "circle", cx: 880, cy: 72, r: 11, fill: CORAL },
    { t: "circle", cx: 908, cy: 108, r: 5, fill: PEACH },
    { t: "circle", cx: 220, cy: 60, r: 6, fill: TEAL },
    { t: "circle", cx: 760, cy: 470, r: 7, fill: PEACH },
    { t: "text", x: 0, y: 112, w: W, text: "SERTIFIKAT", font: "plus-jakarta-sans-700", size: 40, color: INK, align: "center" },
    { t: "text", x: 0, y: 160, w: W, text: "Dengan bangga diberikan kepada", font: "plus-jakarta-sans-400", size: 14, color: MUTE, align: "center" },
    { t: "rect", x: 400, y: 276, w: 160, h: 3, fill: PEACH },
    { t: "text", x: 0, y: 312, w: W, text: "atas partisipasinya dalam", font: "plus-jakarta-sans-400", size: 13, color: MUTE, align: "center" },
    { t: "text", x: 330, y: 462, w: 300, text: "Penyelenggara", font: "plus-jakarta-sans-400", size: 8.5, color: MUTE, align: "center" },
  ],
  fields: [
    { key: "nama", x: 130, y: 228, w: 700, font: "great-vibes-400", size: 56, color: CORAL, align: "center" },
    { key: "acara", x: 130, y: 344, w: 700, font: "plus-jakarta-sans-700", size: 20, color: INK, align: "center" },
    { key: "tanggal", x: 130, y: 374, w: 700, font: "plus-jakarta-sans-400", size: 12, color: MUTE, align: "center" },
    { key: "penyelenggara", x: 330, y: 444, w: 300, font: "plus-jakarta-sans-700", size: 12, color: INK, align: "center" },
    { key: "qr", x: 48, y: 410, w: 64, font: "montserrat-400", size: 10, color: INK, align: "left" },
    { key: "nomor", x: 48, y: 494, w: 260, font: "plus-jakarta-sans-400", size: 7.5, color: MUTE, align: "left" },
  ],
};

export const PRESETS: Preset[] = [klasik, modern, ceria];

export function getPreset(id: string | null | undefined) {
  return PRESETS.find((p) => p.id === id) ?? null;
}
