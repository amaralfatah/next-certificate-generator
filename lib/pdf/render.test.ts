import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { alignX, fitFontSize, formatCertificateNumber, hexToRgb01, pageSizeFor } from "./layout";
import { baselineFromTop } from "./metrics";
import { PRESETS } from "./presets";
import { renderCertificate } from "./render";
import type { TemplateField } from "./types";

const loadFont = async (id: string) => new Uint8Array(await readFile(path.join("public", "fonts", `${id}.ttf`)));

describe("formatCertificateNumber", () => {
  it("pads the sequence to five digits", () => {
    expect(formatCertificateNumber("WBN", 2026, 42)).toBe("WBN-2026-00042");
    expect(formatCertificateNumber("A", 2027, 123456)).toBe("A-2027-123456");
  });
});

describe("fitFontSize", () => {
  const measure = (text: string) => (size: number) => text.length * size * 0.5;

  it("keeps the size when the text fits", () => {
    expect(fitFontSize(measure("Budi"), 32, 400)).toBe(32);
  });

  it("shrinks long names until they fit the box", () => {
    const name = "Raden Ajeng Siti Nurhaliza Kusumawardhani Prawiranegara binti Abdullah";
    const size = fitFontSize(measure(name), 40, 400);
    expect(size).toBeLessThan(40);
    expect(measure(name)(size)).toBeLessThanOrEqual(400);
  });

  it("never goes below the minimum size", () => {
    expect(fitFontSize(() => 10_000, 40, 10)).toBe(6);
  });
});

describe("alignX", () => {
  it("aligns within the box", () => {
    expect(alignX("left", 100, 200, 50)).toBe(100);
    expect(alignX("center", 100, 200, 50)).toBe(175);
    expect(alignX("right", 100, 200, 50)).toBe(250);
  });
});

describe("pageSizeFor", () => {
  it("maps a 16:9 PowerPoint/Canva slide to 960 x 540 pt", () => {
    expect(pageSizeFor(1920, 1080)).toEqual({ widthPt: 960, heightPt: 540 });
    expect(pageSizeFor(3840, 2160)).toEqual({ widthPt: 960, heightPt: 540 });
  });

  it("maps 4:3 slides and A4 (both orientations)", () => {
    expect(pageSizeFor(1024, 768)).toEqual({ widthPt: 720, heightPt: 540 });
    expect(pageSizeFor(3508, 2480)).toEqual({ widthPt: 841.89, heightPt: 595.28 });
    expect(pageSizeFor(2480, 3508)).toEqual({ widthPt: 595.28, heightPt: 841.89 });
  });

  it("keeps the image ratio for other sizes", () => {
    expect(pageSizeFor(2000, 1000)).toEqual({ widthPt: 842, heightPt: 421 });
    expect(pageSizeFor(1000, 2000)).toEqual({ widthPt: 421, heightPt: 842 });
  });
});

describe("hexToRgb01", () => {
  it("parses hex colours", () => {
    expect(hexToRgb01("#ff0000")).toEqual({ r: 1, g: 0, b: 0 });
    expect(hexToRgb01("garbage")).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe("renderCertificate", () => {
  const fields: TemplateField[] = [
    { key: "nama", x: 121, y: 280, w: 600, font: "great-vibes-400", size: 48, color: "#1c2a3a", align: "center" },
    { key: "nomor", x: 40, y: 560, w: 200, font: "montserrat-400", size: 10, color: "#333333", align: "left" },
    { key: "qr", x: 742, y: 495, w: 72, font: "montserrat-400", size: 10, color: "#000000", align: "left" },
  ];

  it("produces a one-page PDF of the template size", async () => {
    const bytes = await renderCertificate({
      widthPt: 842,
      heightPt: 595,
      background: null,
      fields,
      values: { nama: "Siti Rahmawati", nomor: "WBN-2026-00001" },
      qrUrl: "https://piagam.test/v/WBN-2026-00001",
      loadFont,
      watermark: true,
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBe(842);
    expect(height).toBe(595);
  });

  it("renders an 80-character name without throwing", async () => {
    const bytes = await renderCertificate({
      widthPt: 842,
      heightPt: 595,
      background: null,
      fields,
      values: { nama: "A".repeat(80), nomor: "X-2026-00002" },
      qrUrl: "https://piagam.test/v/X",
      loadFont,
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });
});

describe("built-in presets", () => {
  it.each(PRESETS.map((p) => [p.id, p] as const))("%s renders a 960 x 540 pt PDF with every field", async (_id, preset) => {
    const bytes = await renderCertificate({
      widthPt: preset.widthPt,
      heightPt: preset.heightPt,
      background: null,
      shapes: preset.shapes,
      fields: preset.fields,
      values: { nama: "Siti Rahmawati", acara: "Webinar", tanggal: "9 Oktober 2026", nomor: "X-2026-00001", penyelenggara: "Komunitas" },
      qrUrl: "https://piagam.test/v/X-2026-00001",
      loadFont,
    });
    const page = (await PDFDocument.load(bytes)).getPage(0);
    expect(page.getSize()).toEqual({ width: 960, height: 540 });
    expect(preset.fields.map((f) => f.key).sort()).toEqual(["acara", "nama", "nomor", "penyelenggara", "qr", "tanggal"]);
  });

  it("keeps every preset field inside the page", () => {
    for (const p of PRESETS) {
      for (const f of p.fields) {
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.x + f.w).toBeLessThanOrEqual(p.widthPt);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.y + (f.key === "qr" ? f.w : 0)).toBeLessThanOrEqual(p.heightPt);
      }
    }
  });
});

describe("baselineFromTop", () => {
  it("centres the glyph box using the font's own metrics", () => {
    // Montserrat: ascent 0.968, descent 0.251 -> offset (0.968 - 0.251) / 2 * 20 = 7.17
    expect(baselineFromTop(100, 20, "montserrat-400")).toBeCloseTo(107.17, 2);
  });
});
