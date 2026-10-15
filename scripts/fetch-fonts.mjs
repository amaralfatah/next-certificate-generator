// Downloads the curated certificate fonts (Latin subset TTF) from the Fontsource CDN
// into public/fonts. The files are committed; rerun only when the list changes.
import { mkdir, writeFile } from "node:fs/promises";

const FONTS = [
  ["great-vibes", 400],
  ["pinyon-script", 400],
  ["playfair-display", 400],
  ["playfair-display", 700],
  ["cinzel", 400],
  ["cinzel", 700],
  ["eb-garamond", 400],
  ["eb-garamond", 600],
  ["lora", 400],
  ["lora", 700],
  ["montserrat", 400],
  ["montserrat", 700],
  ["plus-jakarta-sans", 400],
  ["plus-jakarta-sans", 700],
];

await mkdir("public/fonts", { recursive: true });
for (const [id, weight] of FONTS) {
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/latin-${weight}-normal.ttf`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  await writeFile(`public/fonts/${id}-${weight}.ttf`, Buffer.from(await res.arrayBuffer()));
  console.log("ok", id, weight);
}
