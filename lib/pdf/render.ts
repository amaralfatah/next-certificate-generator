import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { alignX, fitFontSize, hexToRgb01 } from "./layout";
import { baselineFromTop } from "./metrics";
import type { Shape } from "./presets";
import type { TemplateField } from "./types";

export type RenderInput = {
  widthPt: number;
  heightPt: number;
  background: { bytes: Uint8Array; type: "png" | "jpg" } | null;
  /** Vector design drawn under the fields (built-in presets). */
  shapes?: Shape[];
  fields: TemplateField[];
  /** Text value per field key (nama, acara, ...). Missing keys render nothing. */
  values: Record<string, string>;
  /** URL encoded in the QR field. */
  qrUrl: string;
  loadFont: (id: string) => Promise<Uint8Array>;
  watermark?: boolean;
  title?: string;
};

const color = (hex: string) => {
  const { r, g, b } = hexToRgb01(hex);
  return rgb(r, g, b);
};

/** Renders one certificate. Pure apart from the injected font loader. */
export async function renderCertificate(input: RenderInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  if (input.title) doc.setTitle(input.title);
  doc.setCreator("Piagam");
  doc.setProducer("Piagam");

  const page = doc.addPage([input.widthPt, input.heightPt]);
  const H = input.heightPt;

  const fonts = new Map<string, PDFFont>();
  const fontFor = async (id: string) => {
    let f = fonts.get(id);
    if (!f) {
      f = await doc.embedFont(await input.loadFont(id), { subset: true });
      fonts.set(id, f);
    }
    return f;
  };

  const drawLine = async (
    text: string,
    box: { x: number; y: number; w: number; font: string; size: number; color: string; align: "left" | "center" | "right" },
    opacity = 1,
  ) => {
    const font = await fontFor(box.font);
    const size = fitFontSize((s) => font.widthOfTextAtSize(text, s), box.size, box.w);
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: alignX(box.align, box.x, box.w, width),
      y: H - baselineFromTop(box.y, size, box.font),
      size,
      font,
      color: color(box.color),
      opacity,
    });
  };

  if (input.background) {
    const img =
      input.background.type === "png"
        ? await doc.embedPng(input.background.bytes)
        : await doc.embedJpg(input.background.bytes);
    page.drawImage(img, { x: 0, y: 0, width: input.widthPt, height: H });
  }

  for (const s of input.shapes ?? []) await drawShape(page, H, s, drawLine);

  for (const field of input.fields) {
    if (field.key === "qr") {
      const png = await QRCode.toBuffer(input.qrUrl, {
        type: "png",
        margin: 1,
        width: 512,
        errorCorrectionLevel: "M",
        color: { dark: field.color || "#000000", light: "#ffffff" },
      });
      const img = await doc.embedPng(png);
      page.drawImage(img, { x: field.x, y: H - field.y - field.w, width: field.w, height: field.w });
      continue;
    }
    const text = input.values[field.key]?.trim();
    if (text) await drawLine(text, field);
  }

  if (input.watermark) {
    const f = await doc.embedFont(StandardFonts.Helvetica);
    const label = "dibuat dengan Piagam";
    const size = 6;
    page.drawText(label, {
      x: input.widthPt - f.widthOfTextAtSize(label, size) - 8,
      y: 6,
      size,
      font: f,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.7,
    });
  }

  return doc.save();
}

async function drawShape(
  page: PDFPage,
  H: number,
  s: Shape,
  drawLine: (text: string, box: Extract<Shape, { t: "text" }>, opacity?: number) => Promise<void>,
) {
  const opacity = s.opacity ?? 1;
  switch (s.t) {
    case "rect":
      page.drawRectangle({
        x: s.x,
        y: H - s.y - s.h,
        width: s.w,
        height: s.h,
        color: s.fill ? color(s.fill) : undefined,
        borderColor: s.stroke ? color(s.stroke) : undefined,
        borderWidth: s.stroke ? (s.sw ?? 1) : 0,
        opacity,
        borderOpacity: opacity,
      });
      break;
    case "circle":
      page.drawCircle({
        x: s.cx,
        y: H - s.cy,
        size: s.r,
        color: s.fill ? color(s.fill) : undefined,
        borderColor: s.stroke ? color(s.stroke) : undefined,
        borderWidth: s.stroke ? (s.sw ?? 1) : 0,
        opacity,
        borderOpacity: opacity,
      });
      break;
    case "line":
      page.drawLine({
        start: { x: s.x1, y: H - s.y1 },
        end: { x: s.x2, y: H - s.y2 },
        thickness: s.sw,
        color: color(s.stroke),
        opacity,
      });
      break;
    case "path":
      // drawSvgPath measures y downward from the given origin, matching SVG.
      page.drawSvgPath(s.d, {
        x: 0,
        y: H,
        color: s.fill ? color(s.fill) : undefined,
        borderColor: s.stroke ? color(s.stroke) : undefined,
        borderWidth: s.stroke ? (s.sw ?? 1) : 0,
        opacity,
        borderOpacity: opacity,
      });
      break;
    case "text":
      await drawLine(s.text, s, opacity);
      break;
  }
}
