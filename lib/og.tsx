import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const font = (id: string) => readFile(path.join(process.cwd(), "public", "fonts", `${id}.ttf`));

/** Seal mark as an SVG data URI (Satori renders <img>, not inline SVG children). */
function sealUri() {
  const teeth = 28;
  const pts = Array.from({ length: teeth * 2 }, (_, i) => {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 48 : 44.5;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="${pts}" fill="#b23b22"/><circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.2"/><path d="M36 51 l9 9 l19 -20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Shared social card: ivory paper, double gold rule, title in Playfair. */
export async function ogCard({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const [display, sans] = await Promise.all([font("playfair-display-700"), font("montserrat-700")]);
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
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sealUri()} width={64} height={64} alt="" />
              <div style={{ display: "flex", fontFamily: "Playfair", fontSize: 36, color: "#1c2a3a" }}>Piagam</div>
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
      ],
    },
  );
}
