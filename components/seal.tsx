import { cn } from "@/lib/utils";

/** The stamp seal, in the accent blue: scalloped rim, ribbed ring and a short label (a tick by default). */
export function Seal({ className, label = "✓" }: { className?: string; label?: string }) {
  const teeth = 28;
  const rim = Array.from({ length: teeth * 2 }, (_, i) => {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 48 : 44.5;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className={cn("text-seal", className)} aria-hidden>
      <polygon points={rim} fill="currentColor" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="32" fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth="0.8" strokeDasharray="1.4 2.2" />
      {label === "✓" || label === "×" ? (
        // Drawn, not typeset: "✓" and "×" fall back to a different system font per device (Android clips them).
        <path
          d={label === "✓" ? "M35 51.5L45.5 62L66 38" : "M38 38L62 62M62 38L38 62"}
          fill="none"
          stroke="rgb(255 255 255 / 0.95)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <text
          x="50"
          y="51"
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgb(255 255 255 / 0.95)"
          style={{ font: "700 34px var(--font-body), ui-sans-serif, system-ui, sans-serif" }}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/**
 * The Sararia Certificates glyph: an award rosette in --seal, its two ribbon tails in --seal-ink.
 * Same artwork and colours as the light favicon (sararia-logo, certificatesGlyph(), small variant
 * so the gaps hold at text size), without the tile.
 */
export function Mark({ className }: { className?: string }) {
  const shape = { strokeWidth: 1.2, strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="15 15 70 70" aria-hidden className={className}>
      <g className="fill-seal-ink stroke-seal-ink dark:fill-seal dark:stroke-seal" {...shape}>
        <path d="M48.6 71.57A30.6 30.6 0 0 1 33.4 66.71L28.4 84.4L35.2 79.2L41.6 84.4Z" />
        <path d="M51.4 71.57A30.6 30.6 0 0 0 66.6 66.71L71.6 84.4L64.8 79.2L58.4 84.4Z" />
      </g>
      <path
        d="M50 15.6L55.69 19.75L62.7 19L65.56 25.44L72 28.3L71.25 35.31L75.4 41L71.25 46.69L72 53.7L65.56 56.56L62.7 63L55.69 62.25L50 66.4L44.31 62.25L37.3 63L34.44 56.56L28 53.7L28.75 46.69L24.6 41L28.75 35.31L28 28.3L34.44 25.44L37.3 19L44.31 19.75Z"
        className="fill-seal stroke-seal dark:fill-white dark:stroke-white"
        {...shape}
      />
    </svg>
  );
}

/**
 * In-app header (sararia-logo FAMILY.md 3.1): the glyph, then the product name in Inter SemiBold
 * with -0.045em tracking, in ink. The glyph keeps its own blues.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.4em] py-1.5 text-[1.25rem] leading-none font-semibold tracking-[-0.045em] text-ink pointer-coarse:py-2.5",
        className,
      )}
    >
      <Mark className="size-[1.15em] shrink-0" />
      <span>Certificates</span>
    </span>
  );
}

