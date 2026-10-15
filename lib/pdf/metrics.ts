import metrics from "@/lib/font-metrics.json";

type Metrics = { ascent: number; descent: number };
const TABLE = metrics as Record<string, Metrics>;

/** Ascent/descent of a curated font as a fraction of the em (from scripts/font-metrics.mjs). */
export function fontMetrics(id: string): Metrics {
  return TABLE[id] ?? { ascent: 0.9, descent: 0.25 };
}

/**
 * Baseline, measured from the top of the page, of a line whose glyph box
 * (ascent + descent) is centred on `centerY`. Shared by the PDF renderer and the SVG
 * preview so text lands on exactly the same baseline in both.
 */
export function baselineFromTop(centerY: number, size: number, fontId: string) {
  const m = fontMetrics(fontId);
  return centerY + ((m.ascent - m.descent) / 2) * size;
}
