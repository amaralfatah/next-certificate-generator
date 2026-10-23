"use client";

import { useEffect, useState } from "react";
import { CertificateSvg } from "@/components/certificate-svg";
import { Seal } from "@/components/seal";
import { cssFamily } from "@/lib/fonts";
import { fitFontSize } from "@/lib/pdf/layout";
import { PRESETS } from "@/lib/pdf/presets";
import { cn } from "@/lib/utils";

let ctx: CanvasRenderingContext2D | null | undefined;
function measure(text: string, font: string, size: number) {
  if (typeof document === "undefined") return text.length * size * 0.5;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * size * 0.5;
  ctx.font = `${size}px "${cssFamily(font)}"`;
  return ctx.measureText(text).width;
}

const SWATCH: Record<string, string> = { klasik: "#1c2a3a", modern: "#16324f", ceria: "#e8735a" };

/** Landing hero: type a name, watch the real certificate template fill in. No sign-up. */
export function HeroDemo() {
  const [name, setName] = useState("");
  const [presetId, setPresetId] = useState("klasik");
  const preset = PRESETS.find((p) => p.id === presetId)!;
  // Shrink-to-fit needs real font metrics, so it only kicks in once this design's fonts
  // are loaded (also keeps the server render and first client render identical).
  const [readyFor, setReadyFor] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const fonts = new Set([...preset.fields.map((f) => f.font), ...preset.shapes.flatMap((s) => (s.t === "text" ? [s.font] : []))]);
    Promise.all([...fonts].map((f) => document.fonts.load(`32px "${cssFamily(f)}"`))).then(() => alive && setReadyFor(preset.id));
    return () => {
      alive = false;
    };
  }, [preset]);
  const fontsReady = readyFor === preset.id;

  const values = {
    nama: name.trim() || "Siti Rahmawati",
    acara: "Webinar Literasi Digital untuk Guru",
    tanggal: "9 Oktober 2026",
    penyelenggara: "Komunitas Guru Penggerak",
    nomor: "LDG-2026-00042",
  };

  return (
    <div className="relative mx-auto w-full max-w-[600px]">
      <div className="relative">
      <div className="absolute -inset-5 rotate-2 rounded-md bg-paper-2 sm:-inset-7" aria-hidden />
      <div className="relative rotate-[-1deg] overflow-hidden rounded-[3px] bg-white shadow-[0_30px_60px_-20px_oklch(0.27_0.04_255/0.4),0_0_0_1px_oklch(0.27_0.04_255/0.06)] transition-transform duration-300 ease-out motion-safe:hover:rotate-0">
        <CertificateSvg
          width={preset.widthPt}
          height={preset.heightPt}
          shapes={preset.shapes}
          fields={preset.fields}
          values={values}
          fit={fontsReady ? (text, box) => fitFontSize((s) => measure(text, box.font, s), box.size, box.w) : undefined}
          className="block aspect-video w-full"
          title={`Contoh sertifikat untuk ${values.nama}`}
        />
      </div>
      <Seal className="stamp-in pointer-events-none absolute -top-7 -right-4 size-18 drop-shadow-[0_8px_14px_oklch(0.48_0.16_32/0.35)] [animation-delay:600ms] sm:-top-9 sm:-right-7 sm:size-22" label="✓" />
      </div>

      <div className="relative mt-10 rounded-xl border border-line bg-card/90 p-3 shadow-[0_8px_24px_-16px_oklch(0.27_0.04_255/0.35)] backdrop-blur sm:p-4">
        <label htmlFor="demo-name" className="text-sm font-semibold text-ink">
          Coba ketik namamu
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="demo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Siti Rahmawati"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-3 text-ink outline-none placeholder:text-muted focus:border-seal focus:ring-3 focus:ring-ring/30"
          />
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Desain">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={presetId === p.id}
                aria-label={`Desain ${p.name}`}
                title={p.name}
                onClick={() => setPresetId(p.id)}
                className={cn(
                  "grid h-11 flex-1 place-items-center rounded-lg border px-3 text-xs font-semibold transition-[border-color,background-color,transform] duration-150 active:scale-[0.96] sm:flex-none",
                  presetId === p.id ? "border-ink bg-ink text-paper" : "border-line-strong bg-white text-ink-2 hover:border-ink/40",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full ring-1 ring-current/30" style={{ background: SWATCH[p.id] }} />
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
