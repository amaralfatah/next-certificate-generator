"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  FileText,
  ImageUp,
  Check,
  LayoutTemplate,
  Lock,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { applyPreset, confirmBackground, createBackgroundUpload, saveTemplateFields } from "@/app/dasbor/actions";
import { Button, Input, Label, Notice, Select } from "@/components/ui";
import { CERT_FONTS, cssFamily, type CertFontId } from "@/lib/fonts";
import { defaultField, fitFontSize, MAX_NAME_LENGTH, pageFormatName } from "@/lib/pdf/layout";
import { PRESETS, type Shape } from "@/lib/pdf/presets";
import type { TemplateField } from "@/lib/pdf/types";
import { CertificateSvg } from "@/components/certificate-svg";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string;
  widthPt: number;
  heightPt: number;
  backgroundUrl: string | null;
  preset: { id: string; shapes: Shape[] } | null;
  initialFields: TemplateField[];
  available: { key: string; label: string }[];
  sample: Record<string, string>;
  locked: boolean;
};

const SNAP_PT = 5;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const round = (v: number) => Math.round(v * 10) / 10;

let canvasCtx: CanvasRenderingContext2D | null | undefined;

function measureText(text: string, font: string, size: number, _tick: number) {
  canvasCtx ??= document.createElement("canvas").getContext("2d");
  if (!canvasCtx) return text.length * size * 0.5;
  canvasCtx.font = `${size}px "${cssFamily(font)}"`;
  return canvasCtx.measureText(text).width;
}

export function TemplateEditor(props: Props) {
  const { eventId, widthPt: W, heightPt: H, locked } = props;
  const router = useRouter();
  const [fields, setFields] = useState<TemplateField[]>(props.initialFields);
  const [selected, setSelected] = useState<string | null>(props.initialFields[0]?.key ?? null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "seal"; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [longName, setLongName] = useState(false);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [fontsTick, setFontsTick] = useState(0);
  const [scale, setScale] = useState(0);
  const [showChooser, setShowChooser] = useState(false);
  const hasDesign = !!(props.backgroundUrl || props.preset);

  // Reset local state when the server sends a new template (e.g. after uploading).
  const [prevInitial, setPrevInitial] = useState(props.initialFields);
  if (prevInitial !== props.initialFields && !dirty) {
    setPrevInitial(props.initialFields);
    setFields(props.initialFields);
  }

  // Callback ref: the stage mounts only once a background exists, so observe it on attach.
  const stageRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W));
      ro.observe(el);
      return () => ro.disconnect();
    },
    [W],
  );

  const usedFonts = useMemo(
    () =>
      [
        ...new Set([
          ...fields.map((f) => f.font),
          ...(props.preset?.shapes ?? []).flatMap((s) => (s.t === "text" ? [s.font] : [])),
        ]),
      ].join(","),
    [fields, props.preset],
  );
  useEffect(() => {
    let alive = true;
    Promise.all(usedFonts.split(",").filter(Boolean).map((id) => document.fonts.load(`32px "${cssFamily(id)}"`))).then(
      () => alive && setFontsTick((t) => t + 1),
    );
    return () => {
      alive = false;
    };
  }, [usedFonts]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const values = useMemo<Record<string, string>>(
    () => ({ ...props.sample, ...(longName ? { nama: "Raden Ajeng Siti Nurhaliza Kusumawardhani Prawiranegara binti Abdullah".slice(0, MAX_NAME_LENGTH) } : {}) }),
    [props.sample, longName],
  );

  // Re-measure once fonts finish loading (fontsTick changes the function identity).
  const measure = useCallback(
    (text: string, font: string, size: number) => measureText(text, font, size, fontsTick),
    [fontsTick],
  );

  const fit = useCallback(
    (text: string, box: { font: string; size: number; w: number }) =>
      fitFontSize((s) => measure(text, box.font, s), box.size, box.w),
    [measure],
  );

  // Unfilled custom fields show their placeholder so organizers can see where they sit.
  const displayValues = useMemo(() => {
    const v = { ...values };
    for (const f of fields) if (!v[f.key] && f.key !== "qr") v[f.key] = `{${f.key}}`;
    return v;
  }, [values, fields]);

  const update = useCallback((key: string, patch: Partial<TemplateField>) => {
    setFields((fs) => fs.map((f) => (f.key === key ? { ...f, ...patch } : f)));
    setDirty(true);
    setMessage(null);
  }, []);

  const add = (key: string) => {
    if (locked || fields.some((f) => f.key === key)) return;
    setFields((fs) => [...fs, defaultField(key, W, H)]);
    setSelected(key);
    setDirty(true);
  };

  const remove = (key: string) => {
    setFields((fs) => fs.filter((f) => f.key !== key));
    setSelected(null);
    setDirty(true);
  };

  const save = () =>
    new Promise<boolean>((resolve) => {
      startSave(async () => {
        const r = await saveTemplateFields(eventId, fields);
        setMessage(r?.message ? { tone: r.ok ? "ok" : "seal", text: r.message } : null);
        if (r?.ok) {
          setDirty(false);
          router.refresh();
        }
        resolve(!!r?.ok);
      });
    });

  const preview = async () => {
    const win = window.open("about:blank", "_blank");
    if (dirty && !locked && !(await save())) {
      win?.close();
      return;
    }
    const url = `/api/dasbor/acara/${eventId}/pratinjau${longName ? "?panjang=1" : ""}`;
    if (win) win.location.assign(url);
    else router.push(url);
  };

  // ---- dragging & resizing (pointer events, coordinates converted to pt) ----
  const startDrag = (e: React.PointerEvent, field: TemplateField, mode: "move" | "left" | "right" | "corner") => {
    if (locked || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(field.key);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    const start = { ...field };
    const isQr = field.key === "qr";

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / scale;
      const dy = (ev.clientY - sy) / scale;
      if (mode === "move") {
        let x = clamp(start.x + dx, 0, W - start.w);
        let y = isQr ? clamp(start.y + dy, 0, H - start.w) : clamp(start.y + dy, 0, H);
        const cx = x + start.w / 2;
        const cy = isQr ? y + start.w / 2 : y;
        const snapV = Math.abs(cx - W / 2) < SNAP_PT;
        const snapH = Math.abs(cy - H / 2) < SNAP_PT;
        if (snapV) x = W / 2 - start.w / 2;
        if (snapH) y = isQr ? H / 2 - start.w / 2 : H / 2;
        setGuides({ v: snapV, h: snapH });
        update(field.key, { x: round(x), y: round(y) });
      } else if (mode === "right") {
        update(field.key, { w: round(clamp(start.w + dx, 20, W - start.x)) });
      } else if (mode === "left") {
        const x = clamp(start.x + dx, 0, start.x + start.w - 20);
        update(field.key, { x: round(x), w: round(start.w + (start.x - x)) });
      } else {
        const d = Math.max(dx, dy);
        update(field.key, { w: round(clamp(start.w + d, 24, Math.min(W - start.x, H - start.y))) });
      }
    };
    const onUp = () => {
      setGuides({ v: false, h: false });
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const onKey = (e: React.KeyboardEvent, f: TemplateField) => {
    if (locked) return;
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      update(f.key, { x: round(clamp(f.x + dx, 0, W - f.w)), y: round(clamp(f.y + dy, 0, H)) });
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(f.key);
    }
  };

  const sel = fields.find((f) => f.key === selected) ?? null;
  const labelOf = (key: string) => props.available.find((a) => a.key === key)?.label ?? key;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!locked && (
              <Button onClick={save} disabled={saving || !dirty} variant={dirty ? "seal" : "outline"} size="sm">
                <Save /> {saving ? "Menyimpan…" : dirty ? "Simpan perubahan" : "Tersimpan"}
              </Button>
            )}
            <Button onClick={preview} variant="outline" size="sm" disabled={!hasDesign}>
              <FileText /> Pratinjau PDF
            </Button>
            {!locked && hasDesign && (
              <Button size="sm" variant="ghost" onClick={() => setShowChooser((v) => !v)} aria-expanded={showChooser}>
                <LayoutTemplate /> Ganti desain
              </Button>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2 select-none">
            <input type="checkbox" checked={longName} onChange={(e) => setLongName(e.target.checked)} className="size-4 accent-[var(--seal)]" />
            Uji nama panjang
          </label>
        </div>

        {message && (
          <Notice announce tone={message.tone} className="mb-3">
            {message.text}
          </Notice>
        )}
        {locked && (
          <Notice tone="warn" className="mb-3">
            <Lock />
            <span>Template terkunci karena sudah ada sertifikat terbit, agar semua sertifikat acara ini seragam. Duplikat acara di Pengaturan untuk memakai template baru.</span>
          </Notice>
        )}

        <div className="rounded-xl border border-line bg-paper-2 p-3 sm:p-5">
          {hasDesign ? (
            <div
              ref={stageRef}
              className="relative w-full overflow-hidden bg-white shadow-[0_20px_50px_-24px_oklch(0.27_0.04_255/0.45)] select-none"
              style={{ aspectRatio: `${W} / ${H}` }}
              onPointerDown={() => setSelected(null)}
            >
              {props.backgroundUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={props.backgroundUrl} alt="" className="pointer-events-none absolute inset-0 size-full" draggable={false} />
              )}
              {/* Text is drawn in SVG with the PDF font metrics, so what you see is what prints. */}
              <CertificateSvg
                width={W}
                height={H}
                shapes={props.preset?.shapes}
                fields={fields}
                values={displayValues}
                // Measuring needs the DOM and loaded fonts: skip it during SSR and the first client render (same as the participant preview).
                fit={fontsTick > 0 ? fit : undefined}
                className="pointer-events-none absolute inset-0 size-full"
              />
              {guides.v && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-seal/70" />}
              {guides.h && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-seal/70" />}
              {scale > 0 &&
                fields.map((f) => {
                  const active = f.key === selected;
                  const isQr = f.key === "qr";
                  return (
                    <div
                      key={f.key}
                      role="button"
                      tabIndex={0}
                      aria-label={`${labelOf(f.key)}, geser dengan panah`}
                      aria-pressed={active}
                      onPointerDown={(e) => startDrag(e, f, "move")}
                      onKeyDown={(e) => onKey(e, f)}
                      onFocus={() => setSelected(f.key)}
                      className={cn(
                        "absolute rounded-[2px] outline-none transition-[box-shadow,background-color] duration-150",
                        locked ? "cursor-default" : "cursor-move",
                        active
                          ? "bg-seal/[0.06] ring-2 ring-seal"
                          : "ring-1 ring-ink/0 hover:ring-ink/35 focus-visible:ring-2 focus-visible:ring-seal/60",
                      )}
                      style={
                        isQr
                          ? { left: f.x * scale, top: f.y * scale, width: f.w * scale, height: f.w * scale }
                          : {
                              left: f.x * scale,
                              top: (f.y - f.size * 0.62) * scale,
                              width: f.w * scale,
                              height: f.size * 1.24 * scale,
                            }
                      }
                    >
                      {active && !locked && (
                        <span className="pointer-events-none absolute -top-6 left-0 rounded bg-seal px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white">
                          {labelOf(f.key)}
                        </span>
                      )}
                      {active && !locked && isQr && (
                        <span
                          onPointerDown={(e) => startDrag(e, f, "corner")}
                          className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize rounded-sm border-2 border-white bg-seal"
                        />
                      )}
                      {active && !locked && !isQr && (
                        <>
                          <span
                            onPointerDown={(e) => startDrag(e, f, "left")}
                            className="absolute top-1/2 -left-1.5 h-4 w-3 -translate-y-1/2 cursor-ew-resize rounded-sm border-2 border-white bg-seal"
                          />
                          <span
                            onPointerDown={(e) => startDrag(e, f, "right")}
                            className="absolute top-1/2 -right-1.5 h-4 w-3 -translate-y-1/2 cursor-ew-resize rounded-sm border-2 border-white bg-seal"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <DesignChooser eventId={eventId} sample={props.sample} />
          )}
        </div>
        {hasDesign && !locked && showChooser && (
          <div className="mt-4 rounded-xl border border-line bg-card p-4 sm:p-5 rise [animation-duration:240ms]">
            <DesignChooser eventId={eventId} sample={props.sample} current={props.preset?.id} onDone={() => setShowChooser(false)} />
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          Halaman {pageFormatName(W, H)}, <span className="num">{Math.round(W)} × {Math.round(H)} pt</span>. Seret kolom untuk memindahkan, tarik
          tepinya untuk mengatur lebar. Garis merah muncul saat kolom tepat di tengah. Panah menggeser 1 pt (Shift: 10 pt).
        </p>
      </div>

      <aside className="grid content-start gap-5">
        <section>
          <h2 className="text-lg font-semibold">Kolom</h2>
          <ul className="mt-3 grid gap-1">
            {props.available.map((a) => {
              const placed = fields.some((f) => f.key === a.key);
              return (
                <li key={a.key}>
                  <div
                    className={cn(
                      "flex min-h-10 items-center justify-between gap-2 rounded-lg px-2.5 py-1 text-sm",
                      selected === a.key ? "bg-seal-wash" : "hover:bg-paper-2",
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
                      onClick={() => placed && setSelected(a.key)}
                      disabled={!placed}
                    >
                      <span className={cn("size-2 shrink-0 rounded-full", placed ? "bg-ok" : "bg-line-strong")} />
                      <span className={cn("truncate", placed ? "font-medium text-ink" : "text-ink-2")}>{a.label}</span>
                      <span className="num truncate text-[0.7rem] text-muted">{`{${a.key}}`}</span>
                    </button>
                    {!placed && !locked && hasDesign && (
                      <Button size="sm" variant="ghost" onClick={() => add(a.key)} aria-label={`Tambah ${a.label}`}>
                        <Plus />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {sel && (
          <section className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{labelOf(sel.key)}</h2>
              {!locked && (
                <Button size="sm" variant="ghost" onClick={() => remove(sel.key)} aria-label="Hapus kolom">
                  <Trash2 />
                </Button>
              )}
            </div>
            <fieldset disabled={locked} className="mt-3 grid gap-3">
              {sel.key !== "qr" && (
                <>
                  <div>
                    <Label htmlFor="f-font">Font</Label>
                    <Select id="f-font" value={sel.font} onChange={(e) => update(sel.key, { font: e.target.value as CertFontId })}>
                      {CERT_FONTS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput label="Ukuran (pt)" value={sel.size} min={4} max={200} onChange={(v) => update(sel.key, { size: v })} />
                    <div>
                      <Label htmlFor="f-color">Warna</Label>
                      <div className="flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-card px-2">
                        <input
                          id="f-color"
                          type="color"
                          value={sel.color}
                          onChange={(e) => update(sel.key, { color: e.target.value })}
                          className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                        <span className="num text-xs text-ink-2">{sel.color}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Perataan</Label>
                    <div className="inline-flex rounded-lg border border-line-strong bg-card p-0.5" role="radiogroup" aria-label="Perataan">
                      {(
                        [
                          ["left", AlignLeft, "Kiri"],
                          ["center", AlignCenter, "Tengah"],
                          ["right", AlignRight, "Kanan"],
                        ] as const
                      ).map(([v, Icon, label]) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={sel.align === v}
                          aria-label={label}
                          onClick={() => update(sel.key, { align: v })}
                          className={cn("grid h-8 w-10 place-items-center rounded-md", sel.align === v ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2")}
                        >
                          <Icon className="size-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {sel.key === "qr" && (
                <div>
                  <Label htmlFor="f-color">Warna QR</Label>
                  <input id="f-color" type="color" value={sel.color} onChange={(e) => update(sel.key, { color: e.target.value })} className="h-10 w-16 cursor-pointer rounded-lg border border-line-strong bg-card p-1" />
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <NumberInput label="X" value={sel.x} onChange={(v) => update(sel.key, { x: clamp(v, 0, W) })} />
                <NumberInput label="Y" value={sel.y} onChange={(v) => update(sel.key, { y: clamp(v, 0, H) })} />
                <NumberInput label={sel.key === "qr" ? "Sisi" : "Lebar"} value={sel.w} min={10} onChange={(v) => update(sel.key, { w: clamp(v, 10, W) })} />
              </div>
              {sel.key !== "qr" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => update(sel.key, { x: round(W / 2 - sel.w / 2) })}
                >
                  <AlignCenter /> Tengahkan horizontal
                </Button>
              )}
            </fieldset>
          </section>
        )}
      </aside>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const id = `n-${label}`;
  return (
    <div>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.5"
        min={min}
        max={max}
        value={Math.round(value * 10) / 10}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className="num h-9 px-2"
      />
    </div>
  );
}

function DesignChooser({
  eventId,
  sample,
  current,
  onDone,
}: {
  eventId: string;
  sample: Record<string, string>;
  current?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = (id: string) => {
    setPicked(id);
    setError(null);
    start(async () => {
      const r = await applyPreset(eventId, id);
      if (!r?.ok) setError(r?.message ?? "Gagal memakai template.");
      else {
        router.refresh();
        onDone?.();
      }
    });
  };

  return (
    <div>
      <h3 className="text-xl font-semibold">{current !== undefined ? "Ganti desain" : "Pilih desain sertifikat"}</h3>
      <p className="mt-1 text-sm text-ink-2">
        Mulai dari template siap pakai ukuran slide 16:9, atau unggah desainmu sendiri dari Canva/PowerPoint.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {PRESETS.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => choose(p.id)}
              disabled={pending}
              aria-label={`Pakai template ${p.name}`}
              className={cn(
                "group block w-full overflow-hidden rounded-lg border bg-card text-left transition-[border-color,box-shadow,transform] duration-200 active:scale-[0.98] disabled:opacity-60",
                current === p.id
                  ? "border-seal ring-2 ring-seal/30"
                  : "border-line hover:border-line-strong hover:shadow-[0_10px_24px_-14px_oklch(0.27_0.04_255/0.45)]",
              )}
            >
              <CertificateSvg
                width={p.widthPt}
                height={p.heightPt}
                shapes={p.shapes}
                fields={p.fields}
                values={sample}
                className="block aspect-video w-full"
              />
              <div className="flex items-start justify-between gap-2 border-t border-line px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{p.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.description}</p>
                </div>
                {current === p.id ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-seal" />
                ) : pending && picked === p.id ? (
                  <span className="mt-1 size-3.5 shrink-0 animate-spin rounded-full border-2 border-seal border-t-transparent" />
                ) : null}
              </div>
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-seal-ink">{error}</p>}
      <div className="mt-5 border-t border-line pt-5">
        <BackgroundUpload eventId={eventId} hasBackground={current !== undefined} />
      </div>
    </div>
  );
}

function BackgroundUpload({ eventId, hasBackground, compact }: { eventId: string; hasBackground: boolean; compact?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!["image/png", "image/jpeg"].includes(file.type)) return setError("Format harus PNG atau JPG.");
    if (file.size > 5 * 1024 * 1024) return setError("Ukuran maksimal 5 MB.");
    setBusy(true);
    try {
      const target = await createBackgroundUpload(eventId, file.type, file.size);
      if ("error" in target) throw new Error(target.error);
      const res = await fetch(target.url, { method: "PUT", body: file, headers: { "content-type": file.type } });
      if (!res.ok) throw new Error("Unggah gagal. Coba lagi.");
      const r = await confirmBackground(eventId, target.key);
      if (!r?.ok) throw new Error(r?.message ?? "Unggah gagal.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unggah gagal.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg"
      className="sr-only"
      onChange={(e) => upload(e.target.files?.[0])}
      aria-label="Pilih gambar latar"
    />
  );

  if (compact) {
    return (
      <>
        {input}
        <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
          <ImageUp /> {busy ? "Mengunggah…" : hasBackground ? "Ganti gambar" : "Unggah gambar"}
        </Button>
        {error && <span role="alert" className="text-sm font-medium text-seal-ink">{error}</span>}
      </>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        upload(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "laid grid w-full place-items-center rounded-lg border-2 border-dashed bg-card px-6 py-8 text-center transition-colors",
        drag ? "border-seal bg-seal-wash" : "border-line-strong",
      )}
    >
      {input}
      <div className="max-w-sm">
        <ImageUp className="mx-auto size-10 text-muted" strokeWidth={1.5} />
        <h3 className="mt-4 text-xl font-semibold">Unggah desain sertifikat</h3>
        <p className="mt-2 text-sm text-ink-2">
          PNG atau JPG, maks 5 MB. Ekspor slide PowerPoint/Canva 16:9 (mis. 1920 × 1080 px) atau A4 (3508 × 2480 px). Kosongkan area nama; Piagam yang akan mengisinya.
        </p>
        <Button className="mt-5" onClick={() => inputRef.current?.click()} disabled={busy} variant="seal">
          {busy ? "Mengunggah…" : "Pilih gambar"}
        </Button>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-seal-ink">{error}</p>}
      </div>
    </div>
  );
}
