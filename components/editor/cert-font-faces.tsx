import { CERT_FONTS, cssFamily } from "@/lib/fonts";

/** @font-face rules for the curated certificate fonts (same files the PDF embeds). */
export function CertFontFaces() {
  const css = CERT_FONTS.map(
    (f) => `@font-face{font-family:"${cssFamily(f.id)}";src:url(/fonts/${f.id}.ttf) format("truetype");font-display:swap;}`,
  ).join("");
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
