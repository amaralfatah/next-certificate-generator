"use client";

import { ArrowDown, ArrowUp, CalendarDays, Clock, Copy, GripVertical, KeyRound, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveFormHeader, saveQuestions } from "@/app/forms/actions";
import { Button, Input, Notice, Select, Switch } from "@/components/ui";
import { CHOICE_TYPES, DEFAULT_SCALE, QUESTION_TYPE_LABELS, QUESTION_TYPES, type QuestionConfig, type QuestionType } from "@/lib/forms";
import { cn } from "@/lib/utils";

export type EditorQuestion = {
  key?: string;
  label: string;
  help: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  config: QuestionConfig | null;
  role: "name" | "email" | null;
};
type Q = EditorQuestion & { uid: string };
type Header = { title: string; description: string; date: string; endDate: string; organizerLabel: string };
type SaveState = "idle" | "saving" | "saved" | "error";

const ROLE_NOTE = {
  name: "Jawaban pertanyaan ini dicetak sebagai nama di sertifikat.",
  email: "Sertifikat dikirim ke email ini. Satu email hanya bisa mengisi sekali.",
};
const UNTITLED = "Pertanyaan tanpa judul";
const SAVE_DELAY = 700;

let uidCounter = 0;
const uid = () => `q${++uidCounter}`;

/** Calls `save` a moment after the last edit; `version` changes only on user edits. */
function useAutosave(version: number, save: () => Promise<boolean>): SaveState {
  const [settled, setSettled] = useState({ version: 0, ok: true });
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    if (version === 0) return;
    const t = setTimeout(async () => {
      const ok = await saveRef.current();
      setSettled({ version, ok });
    }, SAVE_DELAY);
    return () => clearTimeout(t);
  }, [version]);
  if (version === 0) return "idle";
  if (settled.version !== version) return "saving";
  return settled.ok ? "saved" : "error";
}

export function FormEditor({
  eventId,
  initialHeader,
  initialQuestions,
  responseCount,
  hasAttendanceCode,
  settingsHref,
}: {
  eventId: string;
  initialHeader: Header;
  initialQuestions: EditorQuestion[];
  responseCount: number;
  hasAttendanceCode: boolean;
  settingsHref: string;
}) {
  const [header, setHeader] = useState(initialHeader);
  const [headerErrors, setHeaderErrors] = useState<Record<string, string>>({});
  const [headerVersion, setHeaderVersion] = useState(0);
  const [questions, setQuestions] = useState<Q[]>(() => initialQuestions.map((q) => ({ ...q, uid: uid() })));
  const [questionsVersion, setQuestionsVersion] = useState(0);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [focusUid, setFocusUid] = useState<string | null>(null);
  // Drag to reorder: the card being dragged stays in the list (faded) and moves as the pointer passes other cards.
  const [dragging, setDragging] = useState<string | null>(null);
  // The last deleted question, kept briefly so a slip of the finger can be undone.
  const [removed, setRemoved] = useState<{ q: Q; index: number } | null>(null);
  useEffect(() => {
    if (!removed) return;
    const t = setTimeout(() => setRemoved(null), 8000);
    return () => clearTimeout(t);
  }, [removed]);
  const restore = () => {
    if (!removed) return;
    const { q, index } = removed;
    edit((qs) => {
      const next = [...qs];
      next.splice(Math.min(index, next.length), 0, q);
      return next;
    });
    setActive(q.uid);
    setRemoved(null);
  };

  const editHeader = (p: Partial<Header>) => {
    setHeader((h) => ({ ...h, ...p }));
    setHeaderVersion((v) => v + 1);
  };
  const edit = useCallback((fn: (qs: Q[]) => Q[]) => {
    setQuestions(fn);
    setQuestionsVersion((v) => v + 1);
  }, []);
  const patch = (id: string, p: Partial<Q>) => edit((qs) => qs.map((q) => (q.uid === id ? { ...q, ...p } : q)));
  const move = (from: number, to: number) =>
    edit((qs) => {
      if (to < 0 || to >= qs.length || from === to) return qs;
      const next = [...qs];
      const [q] = next.splice(from, 1);
      next.splice(to, 0, q);
      return next;
    });

  const headerState = useAutosave(headerVersion, async () => {
    const r = await saveFormHeader(eventId, header);
    setHeaderErrors(r?.errors ?? {});
    return !!r?.ok;
  });
  const questionsState = useAutosave(questionsVersion, async () => {
    const snapshot = questions;
    const r = await saveQuestions(
      eventId,
      snapshot.map((q) => ({
        key: q.key,
        label: q.label.trim() || UNTITLED,
        help: q.help,
        type: q.type,
        required: q.required,
        options: q.options.map((o) => o.trim()).filter(Boolean),
        config: q.type === "scale" ? (q.config ?? DEFAULT_SCALE) : null,
      })),
    );
    if (!r?.ok) {
      setQuestionError(r?.message ?? "Gagal menyimpan pertanyaan.");
      return false;
    }
    setQuestionError(null);
    // Not an edit: keep the version so this does not trigger another save.
    if (r.keys) setQuestions((qs) => qs.map((q) => (q.key ? q : { ...q, key: r.keys![snapshot.findIndex((s) => s.uid === q.uid)] ?? q.key })));
    return true;
  });

  const saveState: SaveState = [headerState, questionsState].includes("error")
    ? "error"
    : [headerState, questionsState].includes("saving")
      ? "saving"
      : [headerState, questionsState].includes("saved")
        ? "saved"
        : "idle";

  // Leaving with an unsaved edit would lose it; the browser asks first.
  useEffect(() => {
    if (saveState !== "saving") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  const activeIndex = questions.findIndex((q) => q.uid === active);
  const addQuestion = (after?: number) => {
    const q: Q = { uid: uid(), label: "", help: "", type: "short_text", required: false, options: ["Opsi 1"], config: null, role: null };
    edit((qs) => {
      const next = [...qs];
      next.splice(after === undefined ? next.length : after + 1, 0, q);
      return next;
    });
    setActive(q.uid);
    setFocusUid(q.uid);
  };

  return (
    <div className="grid gap-3">
      {/* Fixed to the corner so the status never pushes the form around. */}
      {removed && (
        <p className="fixed right-4 bottom-16 z-20 flex items-center gap-3 rounded-full bg-ink py-1.5 pr-1.5 pl-4 text-sm text-paper shadow-soft" role="status">
          Pertanyaan dihapus
          <button type="button" onClick={restore} className="rounded-full bg-paper/15 px-3 py-1 font-semibold hover:bg-paper/25">
            Urungkan
          </button>
        </p>
      )}
      <p className="fixed right-4 bottom-4 z-20 rounded-full bg-card/95 px-3 py-1.5 text-xs text-muted shadow-soft empty:hidden" aria-live="polite">
        {saveState === "saving" ? "Menyimpan…" : saveState === "saved" ? "Semua perubahan tersimpan" : saveState === "error" ? <span className="text-danger">Ada perubahan yang belum tersimpan</span> : null}
      </p>

      {/* Header card: the form's title is the event, and its date and organizer go on the certificate. */}
      <section className="rounded-xl border border-line bg-card px-5 py-5 sm:px-6" aria-label="Judul dan detail formulir">
        <label htmlFor="h-title" className="sr-only">
          Judul formulir
        </label>
        <textarea
          id="h-title"
          value={header.title}
          // A title is one line of text that wraps on narrow screens; Enter does not add a line break.
          onChange={(e) => editHeader({ title: e.target.value.replace(/\n/g, " ") })}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          rows={1}
          maxLength={120}
          placeholder="Judul formulir"
          className="block w-full resize-none rounded-sm border-b border-transparent bg-transparent py-1 text-[2rem] leading-tight font-bold tracking-[-0.03em] outline-none [field-sizing:content] placeholder:text-faint hover:border-line focus:border-seal"
          aria-invalid={!!headerErrors.title}
        />
        {headerErrors.title && <p className="mt-1 text-[0.8rem] font-medium text-danger">{headerErrors.title}</p>}
        <label htmlFor="h-desc" className="sr-only">
          Deskripsi
        </label>
        {/* Same plain style as the title, so both start on the same left edge; a line appears only on hover and focus. */}
        <textarea
          id="h-desc"
          value={header.description}
          onChange={(e) => editHeader({ description: e.target.value })}
          maxLength={1000}
          rows={1}
          placeholder="Deskripsi formulir (opsional)"
          className="mt-2 block w-full resize-none rounded-none border-b border-transparent bg-transparent py-1 leading-relaxed text-ink-2 outline-none [field-sizing:content] placeholder:text-faint hover:border-line focus:border-seal"
        />
        <div className="mt-4 grid grid-cols-1 gap-3 min-[30rem]:grid-cols-2 sm:grid-cols-[160px_160px_1fr]">
          <div>
            <label htmlFor="h-date" className="mb-1 block text-xs font-medium text-muted">
              Tanggal acara
            </label>
            <Input id="h-date" type="date" value={header.date} onChange={(e) => editHeader({ date: e.target.value })} aria-invalid={!!headerErrors.date} />
          </div>
          <div>
            <label htmlFor="h-end" className="mb-1 block text-xs font-medium text-muted">
              Sampai <span className="font-normal">(opsional)</span>
            </label>
            {/* Only for events longer than a day; the certificate then reads e.g. "24–26 Oktober 2026". */}
            <Input
              id="h-end"
              type="date"
              value={header.endDate}
              min={header.date}
              onChange={(e) => editHeader({ endDate: e.target.value })}
              aria-invalid={!!headerErrors.endDate}
            />
          </div>
          <div className="min-[30rem]:col-span-2 sm:col-span-1">
            <label htmlFor="h-org" className="mb-1 block text-xs font-medium text-muted">
              Penyelenggara
            </label>
            <Input
              id="h-org"
              value={header.organizerLabel}
              onChange={(e) => editHeader({ organizerLabel: e.target.value })}
              maxLength={120}
              aria-invalid={!!headerErrors.organizerLabel}
            />
          </div>
        </div>
        {(headerErrors.date || headerErrors.endDate || headerErrors.organizerLabel) && (
          <p className="mt-1.5 text-[0.8rem] font-medium text-danger">{headerErrors.date ?? headerErrors.endDate ?? headerErrors.organizerLabel}</p>
        )}
      </section>

      {questionError && (
        <Notice tone="danger" announce>
          <span>{questionError}</span>
        </Notice>
      )}

      <ol className="grid gap-3" aria-label="Pertanyaan">
        {questions.map((q, i) => (
          <li
            key={q.uid}
            className={cn("transition-opacity", dragging === q.uid && "opacity-40")}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              const from = questions.findIndex((x) => x.uid === dragging);
              if (from === i) return;
              // Swap only once the pointer passes the middle of the card, so tall cards do not flicker back and forth.
              const box = e.currentTarget.getBoundingClientRect();
              const pastMiddle = e.clientY > box.top + box.height / 2;
              if ((from < i && pastMiddle) || (from > i && !pastMiddle)) move(from, i);
            }}
            onDrop={(e) => e.preventDefault()}
          >
            <QuestionCard
              q={q}
              index={i}
              count={questions.length}
              active={active === q.uid}
              autoFocus={focusUid === q.uid}
              onActivate={() => setActive(q.uid)}
              onPatch={(p) => patch(q.uid, p)}
              onMove={(to) => move(i, to)}
              onDragStart={() => setDragging(q.uid)}
              onDragEnd={() => setDragging(null)}
              onDuplicate={() => {
                const copy: Q = { ...q, uid: uid(), key: undefined, role: null, label: `${q.label || UNTITLED} (salinan)`.slice(0, 200) };
                edit((qs) => [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)]);
                setActive(copy.uid);
              }}
              responseCount={responseCount}
              onDelete={() => {
                setRemoved({ q, index: i });
                edit((qs) => qs.filter((x) => x.uid !== q.uid));
                setActive(null);
              }}
            />
          </li>
        ))}
        {hasAttendanceCode && (
          <li className="flex items-start gap-3 rounded-xl border border-dashed border-line-strong bg-card/60 px-5 py-4 sm:px-6">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold">
                Kode kehadiran <span className="text-danger">*</span>
              </p>
              <p className="text-muted">
                Selalu tampil sebagai pertanyaan terakhir.{" "}
                <Link href={settingsHref} className="font-medium text-seal-ink hover:underline">
                  Atur di Setelan
                </Link>
              </p>
            </div>
          </li>
        )}
      </ol>

      <div>
        <Button variant="outline" onClick={() => addQuestion(activeIndex >= 0 ? activeIndex : undefined)} disabled={questions.length >= 40}>
          <Plus /> Tambah pertanyaan
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  index,
  count,
  active,
  autoFocus,
  onActivate,
  onPatch,
  onMove,
  onDragStart,
  onDragEnd,
  onDuplicate,
  onDelete,
  responseCount,
}: {
  responseCount: number;
  q: Q;
  index: number;
  count: number;
  active: boolean;
  autoFocus: boolean;
  onActivate: () => void;
  onPatch: (p: Partial<Q>) => void;
  onMove: (to: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const name = q.label || UNTITLED;
  return (
    <div
      onFocusCapture={onActivate}
      onClick={onActivate}
      className={cn(
        "group relative rounded-xl border bg-card transition-[border-color,box-shadow]",
        active ? "border-seal/50 shadow-soft" : "border-line hover:border-line-strong",
      )}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          // Lift the whole card, not just this handle strip, and keep it under the pointer where it was grabbed.
          const card = e.currentTarget.parentElement!;
          const box = card.getBoundingClientRect();
          e.dataTransfer.setDragImage(card, e.clientX - box.left, e.clientY - box.top);
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className="flex cursor-grab justify-center pt-1.5 text-faint opacity-60 group-hover:opacity-100 active:cursor-grabbing"
        title="Seret untuk mengubah urutan"
        aria-hidden
      >
        <GripVertical className="size-4 rotate-90" />
      </div>

      {!active ? (
        <button type="button" className="block w-full px-5 pt-1 pb-5 text-left sm:px-6" aria-label={`Edit pertanyaan: ${name}`}>
          <p className={cn("font-medium", !q.label && "text-muted")}>
            {name}
            {q.required && <span className="ml-1 text-danger">*</span>}
          </p>
          {q.help && <p className="mt-0.5 text-sm text-muted">{q.help}</p>}
          <AnswerPreview q={q} />
          {q.role && <p className="mt-3 text-xs text-muted">{ROLE_NOTE[q.role]}</p>}
        </button>
      ) : (
        <div className="grid gap-4 px-5 pt-1 pb-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <div>
              <label htmlFor={`${q.uid}-label`} className="sr-only">
                Pertanyaan
              </label>
              <Input
                id={`${q.uid}-label`}
                value={q.label}
                onChange={(e) => onPatch({ label: e.target.value })}
                maxLength={200}
                placeholder="Pertanyaan"
                autoFocus={autoFocus}
                className="font-medium"
              />
            </div>
            <div>
              <label htmlFor={`${q.uid}-type`} className="sr-only">
                Jenis pertanyaan
              </label>
              <Select
                id={`${q.uid}-type`}
                value={q.type}
                disabled={!!q.role}
                onChange={(e) => {
                  const type = e.target.value as QuestionType;
                  onPatch({ type, options: q.options.length ? q.options : ["Opsi 1"], config: type === "scale" ? (q.config ?? DEFAULT_SCALE) : q.config });
                }}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label htmlFor={`${q.uid}-help`} className="sr-only">
              Petunjuk
            </label>
            <Input id={`${q.uid}-help`} value={q.help} onChange={(e) => onPatch({ help: e.target.value })} maxLength={300} placeholder="Petunjuk (opsional)" className="text-sm" />
          </div>

          {CHOICE_TYPES.includes(q.type) && <OptionsEditor q={q} onPatch={onPatch} />}
          {q.type === "scale" && <ScaleEditor q={q} onPatch={onPatch} />}
          {!CHOICE_TYPES.includes(q.type) && q.type !== "scale" && <AnswerPreview q={q} />}
          {q.role && <p className="text-xs text-muted">{ROLE_NOTE[q.role]}</p>}

          {responseCount > 0 && <p className="text-xs text-muted">Sudah ada {responseCount} respons. Mengubah pertanyaan tidak mengubah jawaban yang sudah masuk.</p>}

          <div className="flex flex-wrap items-center justify-end gap-1 border-t border-line pt-3">
            <Button variant="ghost" size="sm" onClick={() => onMove(index - 1)} disabled={index === 0} aria-label={`Naikkan ${name}`} title="Naikkan">
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onMove(index + 1)} disabled={index === count - 1} aria-label={`Turunkan ${name}`} title="Turunkan">
              <ArrowDown />
            </Button>
            {!q.role && (
              <>
                <Button variant="ghost" size="sm" onClick={onDuplicate} aria-label={`Duplikat ${name}`} title="Duplikat">
                  <Copy />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    // Keep the click from re-activating the card that is being removed.
                    e.stopPropagation();
                    onDelete();
                  }}
                  aria-label={`Hapus ${name}`}
                  title="Hapus"
                >
                  <Trash2 />
                </Button>
              </>
            )}
            <span className="mx-2 h-6 w-px bg-line" aria-hidden />
            <Switch checked={q.required} onChange={(required) => onPatch({ required })} disabled={!!q.role} label="Wajib" />
          </div>
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ q, onPatch }: { q: Q; onPatch: (p: Partial<Q>) => void }) {
  const set = (options: string[]) => onPatch({ options });
  // Focus a just-added option once it is in the DOM.
  const pendingFocus = useRef<number | null>(null);
  useEffect(() => {
    if (pendingFocus.current === null) return;
    document.getElementById(`${q.uid}-opt-${pendingFocus.current}`)?.focus();
    pendingFocus.current = null;
  });
  const focusOption = (i: number) => (pendingFocus.current = i);
  return (
    <div className="grid gap-2">
      {q.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <Marker type={q.type} n={i + 1} />
          <label htmlFor={`${q.uid}-opt-${i}`} className="sr-only">
            Opsi {i + 1}
          </label>
          <Input
            id={`${q.uid}-opt-${i}`}
            value={o}
            maxLength={100}
            onChange={(e) => set(q.options.map((x, j) => (j === i ? e.target.value : x)))}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              set([...q.options.slice(0, i + 1), "", ...q.options.slice(i + 1)]);
              focusOption(i + 1);
            }}
            className="h-9 md:h-9"
          />
          <Button variant="ghost" size="sm" onClick={() => set(q.options.filter((_, j) => j !== i))} disabled={q.options.length <= 1} aria-label={`Hapus opsi ${o || i + 1}`}>
            <X />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Marker type={q.type} n={q.options.length + 1} />
        <button
          type="button"
          onClick={() => {
            set([...q.options, `Opsi ${q.options.length + 1}`]);
            focusOption(q.options.length);
          }}
          disabled={q.options.length >= 50}
          className="rounded-md py-1.5 text-sm font-medium text-seal-ink hover:underline disabled:opacity-50"
        >
          Tambah opsi
        </button>
      </div>
    </div>
  );
}

function ScaleEditor({ q, onPatch }: { q: Q; onPatch: (p: Partial<Q>) => void }) {
  const c = q.config ?? DEFAULT_SCALE;
  const set = (p: Partial<QuestionConfig>) => onPatch({ config: { ...c, ...p } });
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor={`${q.uid}-min`} className="sr-only">
          Nilai terkecil
        </label>
        <Select id={`${q.uid}-min`} value={c.min} onChange={(e) => set({ min: Number(e.target.value) })} className="w-20">
          {[0, 1].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </Select>
        <span className="text-muted">sampai</span>
        <label htmlFor={`${q.uid}-max`} className="sr-only">
          Nilai terbesar
        </label>
        <Select id={`${q.uid}-max`} value={c.max} onChange={(e) => set({ max: Number(e.target.value) })} className="w-20">
          {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
            <option key={n}>{n}</option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={c.minLabel ?? ""} onChange={(e) => set({ minLabel: e.target.value })} maxLength={40} placeholder={`Label untuk ${c.min} (opsional)`} aria-label={`Label untuk ${c.min}`} className="text-sm" />
        <Input value={c.maxLabel ?? ""} onChange={(e) => set({ maxLabel: e.target.value })} maxLength={40} placeholder={`Label untuk ${c.max} (opsional)`} aria-label={`Label untuk ${c.max}`} className="text-sm" />
      </div>
    </div>
  );
}

function Marker({ type, n }: { type: QuestionType; n: number }) {
  if (type === "dropdown") return <span className="num w-4 shrink-0 text-right text-sm text-muted">{n}.</span>;
  return <span className={cn("size-4 shrink-0 border-2 border-line-strong", type === "radio" ? "rounded-full" : "rounded-[3px]")} aria-hidden />;
}

/** How the answer looks to the participant, drawn quietly so the organizer can scan the form. */
function AnswerPreview({ q }: { q: Q }) {
  const line = (w: string) => <div className={cn("mt-4 border-b border-dotted border-line-strong pb-1.5 text-sm text-faint", w)}>{q.type === "paragraph" ? "Jawaban panjang" : "Jawaban singkat"}</div>;
  switch (q.type) {
    case "paragraph":
      return line("w-full");
    case "radio":
    case "checkbox":
      return (
        <ul className="mt-3 grid gap-2 text-sm text-ink-2">
          {q.options.slice(0, 6).map((o, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <Marker type={q.type} n={i + 1} />
              {o || <span className="text-faint">Opsi kosong</span>}
            </li>
          ))}
          {q.options.length > 6 && <li className="text-xs text-muted">+{q.options.length - 6} opsi lagi</li>}
        </ul>
      );
    case "dropdown":
      return <p className="mt-3 text-sm text-muted">{q.options.length} opsi dalam dropdown</p>;
    case "date":
      return (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-faint">
          <CalendarDays className="size-4" aria-hidden /> Tanggal
        </p>
      );
    case "time":
      return (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-faint">
          <Clock className="size-4" aria-hidden /> Waktu
        </p>
      );
    case "scale": {
      const c = q.config ?? DEFAULT_SCALE;
      return (
        <p className="num mt-3 text-sm text-muted">
          {c.minLabel && `${c.minLabel} · `}
          {c.min} – {c.max}
          {c.maxLabel && ` · ${c.maxLabel}`}
        </p>
      );
    }
    default:
      return line("w-1/2");
  }
}
