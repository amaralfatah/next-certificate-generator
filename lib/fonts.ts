// Curated certificate fonts. Files live in public/fonts (Latin subset TTF) so the editor
// can load them with @font-face and the PDF renderer can embed the exact same file.
export const CERT_FONTS = [
  { id: "great-vibes-400", family: "Great Vibes", label: "Great Vibes (sambung)" },
  { id: "pinyon-script-400", family: "Pinyon Script", label: "Pinyon Script (sambung)" },
  { id: "playfair-display-400", family: "Playfair Display", label: "Playfair Display" },
  { id: "playfair-display-700", family: "Playfair Display", label: "Playfair Display Tebal", weight: 700 },
  { id: "cinzel-400", family: "Cinzel", label: "Cinzel" },
  { id: "cinzel-700", family: "Cinzel", label: "Cinzel Tebal", weight: 700 },
  { id: "eb-garamond-400", family: "EB Garamond", label: "EB Garamond" },
  { id: "eb-garamond-600", family: "EB Garamond", label: "EB Garamond Tebal", weight: 600 },
  { id: "lora-400", family: "Lora", label: "Lora" },
  { id: "lora-700", family: "Lora", label: "Lora Tebal", weight: 700 },
  { id: "montserrat-400", family: "Montserrat", label: "Montserrat" },
  { id: "montserrat-700", family: "Montserrat", label: "Montserrat Tebal", weight: 700 },
  { id: "plus-jakarta-sans-400", family: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { id: "plus-jakarta-sans-700", family: "Plus Jakarta Sans", label: "Plus Jakarta Sans Tebal", weight: 700 },
] as const;

export type CertFontId = (typeof CERT_FONTS)[number]["id"];
export const FONT_IDS = CERT_FONTS.map((f) => f.id) as [CertFontId, ...CertFontId[]];

/** CSS font-family used by the editor: one family per file so metrics match the PDF. */
export const cssFamily = (id: string) => `cert-${id}`;
