import { cn } from "@/lib/utils";

/** The wax seal: Piagam's single signature mark. Scalloped rim, ribbed ring, a "P". */
export function Seal({ className, label = "P" }: { className?: string; label?: string }) {
  const teeth = 28;
  const rim = Array.from({ length: teeth * 2 }, (_, i) => {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 48 : 44.5;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className={cn("text-seal", className)} aria-hidden>
      <polygon points={rim} fill="currentColor" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="oklch(1 0 0 / 0.35)" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="32" fill="none" stroke="oklch(1 0 0 / 0.22)" strokeWidth="0.8" strokeDasharray="1.4 2.2" />
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fill="oklch(1 0 0 / 0.92)"
        style={{ font: "600 34px var(--font-display-face), Georgia, serif" }}
      >
        {label}
      </text>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Seal className="size-7 -rotate-8" />
      <span className="font-display text-[1.35rem] leading-none font-semibold tracking-tight text-ink" style={{ fontVariationSettings: '"opsz" 48' }}>
        Piagam
      </span>
    </span>
  );
}
