// Writes lib/font-metrics.json: ascent/descent per curated font (fraction of 1 em), read
// from the same TTF files the PDF embeds. The editor uses them to place text baselines
// exactly where pdf-lib will.
import fontkit from "@pdf-lib/fontkit";
import { readdir, readFile, writeFile } from "node:fs/promises";

const out = {};
for (const file of (await readdir("public/fonts")).filter((f) => f.endsWith(".ttf")).sort()) {
  const font = fontkit.create(await readFile(`public/fonts/${file}`));
  const upm = font.unitsPerEm;
  out[file.replace(/\.ttf$/, "")] = {
    ascent: +((font.ascent || font.bbox.maxY) / upm).toFixed(4),
    descent: +(Math.abs(font.descent || font.bbox.minY) / upm).toFixed(4),
  };
}
await writeFile("lib/font-metrics.json", JSON.stringify(out, null, 2) + "\n");
console.log(out);
