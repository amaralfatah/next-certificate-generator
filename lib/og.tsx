import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const font = (id: string) => readFile(path.join(process.cwd(), "public", "fonts", `${id}.ttf`));

/**
 * The Sararia Certificates glyph (components/seal.tsx Mark) as an SVG data URI, since Satori renders
 * <img>, not inline SVG children. Rosette in the app's blue (--seal), ribbon tails in --seal-ink.
 */
function markUri() {
  const shape = (d: string, fill: string) => `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="1.2" stroke-linejoin="round"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="15 15 70 70">` +
    shape("M48.6 71.57A30.6 30.6 0 0 1 33.4 66.71L28.4 84.4L35.2 79.2L41.6 84.4Z", "#005bab") +
    shape("M51.4 71.57A30.6 30.6 0 0 0 66.6 66.71L71.6 84.4L64.8 79.2L58.4 84.4Z", "#005bab") +
    shape(
      "M50 15.6L55.69 19.75L62.7 19L65.56 25.44L72 28.3L71.25 35.31L75.4 41L71.25 46.69L72 53.7L65.56 56.56L62.7 63L55.69 62.25L50 66.4L44.31 62.25L37.3 63L34.44 56.56L28 53.7L28.75 46.69L24.6 41L28.75 35.31L28 28.3L34.44 25.44L37.3 19L44.31 19.75Z",
      "#0075de",
    ) +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Shared social card: ivory paper, double gold rule, title in Playfair. */
export async function ogCard({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const [display, sans, brand] = await Promise.all([font("playfair-display-700"), font("montserrat-700"), font("inter-600")]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#1c2a3a", padding: 28 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#fbf7ee",
            border: "2px solid #b8924a",
            boxShadow: "inset 0 0 0 8px #fbf7ee, inset 0 0 0 9px #b8924a",
            padding: "64px 72px",
          }}
        >
          <div style={{ display: "flex", fontFamily: "Montserrat", fontSize: 26, color: "#a8321f" }}>
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Playfair",
              fontSize: title.length > 60 ? 54 : title.length > 36 ? 64 : 76,
              lineHeight: 1.1,
              color: "#1c2a3a",
              maxWidth: 940,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontFamily: "Montserrat", fontSize: 24, color: "#5b6472" }}>{footer}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={markUri()} width={44} height={44} alt="" />
              <div style={{ display: "flex", fontFamily: "Inter", fontSize: 30, letterSpacing: "-0.045em", color: "#1c2a3a" }}>
                Sararia Certificates
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Playfair", data: display, weight: 700, style: "normal" },
        { name: "Montserrat", data: sans, weight: 700, style: "normal" },
        { name: "Inter", data: brand, weight: 600, style: "normal" },
      ],
    },
  );
}
