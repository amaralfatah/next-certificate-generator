"use client";

import { ArrowLeft, CircleAlert, Download, Loader2, Mail, RotateCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Seal } from "@/components/seal";
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/turnstile";
import { Button, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { type Answers, answerText, cleanName, DEFAULT_SCALE, type FieldDef, validateSubmission } from "@/lib/forms";
import { CertificateSvg } from "@/components/certificate-svg";
import { cssFamily } from "@/lib/fonts";
import { fitFontSize, MAX_NAME_LENGTH } from "@/lib/pdf/layout";
import type { Shape } from "@/lib/pdf/presets";
import type { TemplateField } from "@/lib/pdf/types";
import { cn } from "@/lib/utils";

export type CertPreview = {
  widthPt: number;
  heightPt: number;
  backgroundUrl: string | null;
  shapes?: Shape[];
  fields: TemplateField[];
  values: Record<string, string>;
};

let measureCtx: CanvasRenderingContext2D | null | undefined;
function measureText(text: string, font: string, size: number) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * size * 0.5;
  measureCtx.font = `${size}px "${cssFamily(font)}"`;
  return measureCtx.measureText(text).width;
}

/** The participant's actual certificate, with their name, rendered like the PDF. */
function CertificatePreview({ preview, values }: { preview: CertPreview; values: Record<string, string> }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const fonts = new Set(preview.fields.map((f) => f.font).concat((preview.shapes ?? []).flatMap((s) => (s.t === "text" ? [s.font] : []))));
    Promise.all([...fonts].map((f) => document.fonts.load(`32px "${cssFamily(f)}"`))).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [preview]);
  return (
    <div
      className="relative mt-5 overflow-hidden rounded-[3px] bg-white shadow-lift"
      style={{ aspectRatio: `${preview.widthPt} / ${preview.heightPt}` }}
    >
      {preview.backgroundUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.backgroundUrl} alt="" className="absolute inset-0 size-full" />
      )}
      <CertificateSvg
        width={preview.widthPt}
        height={preview.heightPt}
        shapes={preview.shapes}
        fields={preview.fields}
        values={values}
        fit={ready ? (text, box) => fitFontSize((sz) => measureText(text, box.font, sz), box.size, box.w) : undefined}
        className={cn("absolute inset-0 size-full transition-opacity duration-200", ready ? "opacity-100" : "opacity-0")}
        title={`Pratinjau sertifikat untuk ${values.nama}`}
      />
    </div>
  );
}

/** One question card. The card turns red while its answer is invalid. Choice groups use fieldset/legend. */
function Question({
  label,
  htmlFor,
  required,
  hint,
  error,
  group,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  group?: boolean;
  children: React.ReactElement<{ "aria-describedby"?: string }>;
}) {
  const title = (
    <>
      {label}
      {required && (
        <span className="ml-1 text-danger" aria-hidden>
          *
        </span>
      )}
    </>
  );
  const card = cn(
    "rounded-xl border bg-card px-5 py-5 transition-[border-color,box-shadow] sm:px-6",
    error ? "border-danger" : "border-line focus-within:border-seal/50 focus-within:shadow-soft",
  );
  if (!group) {
    return (
      <div className={card}>
        <Field label={title} labelClassName="mb-3! text-base!" htmlFor={htmlFor} hint={hint} error={error}>
          {children}
        </Field>
      </div>
    );
  }
  const describedBy = error || hint ? `${htmlFor}-desc` : undefined;
  return (
    <fieldset id={htmlFor} tabIndex={-1} className={cn(card, "outline-none")} aria-describedby={describedBy} aria-invalid={!!error || undefined}>
      <legend className="float-left mb-3 w-full text-base font-medium text-ink">{title}</legend>
      <div className="clear-both">{children}</div>
      {error ? (
        <p id={describedBy} className="mt-2 text-[0.8rem] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={describedBy} className="mt-2 text-[0.8rem] text-muted">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

type Success = { number: string; pending: boolean; downloadUrl: string; retryUrl: string; verifyUrl: string };
type Phase = "fill" | "done" | "duplicate";

const NAME_HINT = "Tulis seperti yang ingin tercetak, termasuk gelar bila perlu.";

export function ParticipantForm({
  slug,
  eventTitle,
  fields,
  needsCode,
  emailEnabled,
  preview,
  previewOnly,
}: {
  slug: string;
  eventTitle: string;
  fields: FieldDef[];
  needsCode: boolean;
  emailEnabled: boolean;
  preview?: CertPreview;
  /** The organizer's Pratinjau: everything works except sending. */
  previewOnly?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("fill");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [result, setResult] = useState<Success | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const onToken = useCallback((t: string | null) => setToken(t), []);
  // Each phase swaps the whole card; move focus to its heading so keyboard and screen-reader users land on the new step.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (phase !== "fill") headingRef.current?.focus({ preventScroll: true });
  }, [phase]);
  // Inline validation: an error clears as soon as the participant edits that field.
  const clearError = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  const setAnswer = (key: string, v: string | string[]) => {
    setAnswers((a) => ({ ...a, [key]: v }));
    clearError(key);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewOnly) return;
    setMessage(null);
    const v = validateSubmission(fields, { name, email, answers });
    const errs = { ...v.errors };
    if (needsCode && !code.trim()) errs.attendanceCode = "Kode kehadiran wajib diisi.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    if (TURNSTILE_SITE_KEY && !token) {
      setMessage("Tunggu verifikasi keamanan selesai, lalu coba lagi.");
      return;
    }
    setName(v.value.name);
    setBusy(true);
    try {
      const res = await fetch(`/api/f/${slug}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: v.value.name, email, answers: v.value.answers, attendanceCode: needsCode ? code : undefined, turnstileToken: token }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data);
        setPhase("done");
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        return;
      }
      setResetKey((k) => k + 1);
      if (data.code === "duplicate") {
        setPhase("duplicate");
        return;
      }
      setErrors(data.fieldErrors ?? {});
      setMessage(data.message ?? "Terjadi kesalahan. Coba lagi.");
      const first = Object.keys(data.fieldErrors ?? {})[0];
      if (first) document.getElementById(`f-${first}`)?.focus();
    } catch {
      setMessage("Koneksi terputus. Periksa internet lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (!result) return;
    setBusy(true);
    try {
      const res = await fetch(result.retryUrl, { method: "POST" });
      const data = await res.json();
      if (data.ok) setResult({ ...result, ...data, pending: false });
      else setMessage(data.message);
    } catch {
      setMessage("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/f/${slug}/resend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: token }),
      });
      const data = await res.json();
      setResendMsg(data.message);
      setResetKey((k) => k + 1);
    } catch {
      setResendMsg("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    setName("");
    setEmail("");
    setAnswers({});
    setCode("");
    setErrors({});
    setMessage(null);
    formRef.current?.querySelector<HTMLElement>("input,select,textarea")?.focus();
  };

  if (phase === "done" && result) {
    const printed = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, answerText(v)]));
    return (
      <div className="grid gap-3 rise">
        <section className="rounded-xl border border-line bg-card px-5 py-6 sm:px-6">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
            Jawabanmu sudah terkirim
          </h2>
          <p className="mt-1 text-ink-2">Terima kasih sudah hadir di {eventTitle}.</p>
        </section>

        <section className="rounded-xl border border-line bg-card px-5 py-6 text-center sm:px-6" aria-labelledby="cert-title">
          <h3 id="cert-title" className="text-lg font-semibold">
            {result.pending ? "Sertifikatmu sedang disiapkan" : "Sertifikatmu sudah siap"}
          </h3>
          {preview && !result.pending ? (
            <div className="relative">
              <CertificatePreview preview={preview} values={{ ...preview.values, ...printed, nama: name, nomor: result.number }} />
              <Seal className="stamp-in absolute -top-4 -right-3 size-14 drop-shadow-[0_8px_14px_rgb(0_117_222/0.28)] [animation-delay:200ms]" label="✓" />
            </div>
          ) : null}
          {result.pending ? (
            <>
              <Notice tone="warn" className="mt-5 text-left">
                <CircleAlert />
                <span>Sertifikat belum berhasil dibuat. Jawabanmu sudah tersimpan; tekan tombol di bawah untuk mencoba lagi.</span>
              </Notice>
              <Button className="mt-5 w-full" size="lg" onClick={retry} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <RotateCw />} Coba buat lagi
              </Button>
            </>
          ) : (
            <>
              <a
                href={result.downloadUrl}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-seal text-base font-medium text-white transition-[background-color,transform] duration-150 hover:bg-seal-ink active:scale-[0.98]"
              >
                <Download className="size-5" /> Unduh sertifikat (PDF)
              </a>
              {emailEnabled ? (
                <p className="mt-4 flex items-start justify-center gap-2 text-sm text-ink-2">
                  <Mail className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  <span>
                    Salinannya juga dikirim ke <b className="break-all">{email}</b>. Periksa folder spam jika tidak ada.
                  </span>
                </p>
              ) : (
                <p className="mt-4 text-sm text-ink-2">Simpan file PDF-nya sekarang. Link unduhan ini berlaku 1 jam.</p>
              )}
            </>
          )}
          {message && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {message}
            </p>
          )}
          <p className="num mt-5 text-xs text-muted">No. {result.number}</p>
          <a href={result.verifyUrl} className="mt-1 inline-flex items-center gap-1.5 py-1 text-sm font-semibold text-ink-2 hover:text-ink">
            <ShieldCheck className="size-4" aria-hidden /> Lihat halaman verifikasi
          </a>
          {/* Every participant is a possible organizer; this is the one place they have just seen the product work. */}
          {!result.pending && (
            <p className="mt-6 border-t border-line pt-4 text-sm text-ink-2">
              Menyelenggarakan acara?{" "}
              <Link href="/start" prefetch={false} className="inline-flex items-center py-1 font-semibold text-seal-ink hover:underline hover:underline-offset-4 pointer-coarse:py-2.5">
                Buat sertifikat seperti ini, gratis
              </Link>
            </p>
          )}
        </section>
      </div>
    );
  }

  if (phase === "duplicate") {
    return (
      <div className="rounded-xl border border-line bg-card px-5 py-6 sm:px-6 rise">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
          Email ini sudah mengisi formulir
        </h2>
        <p className="mt-2 text-ink-2">
          <b className="break-all">{email}</b> sudah mengirim jawaban untuk {eventTitle}. Setiap email hanya bisa mengisi sekali. Sertifikatnya bisa dikirim ulang ke email itu.
        </p>
        <Turnstile onToken={onToken} resetKey={resetKey} />
        {resendMsg ? (
          <Notice tone="ok" className="mt-5" announce>
            {resendMsg}
          </Notice>
        ) : (
          <Button className="mt-5 w-full" size="lg" onClick={resend} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Mail />} Kirim ulang sertifikat ke email ini
          </Button>
        )}
        <Button
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => {
            setPhase("fill");
            setResendMsg(null);
          }}
        >
          <ArrowLeft /> Gunakan email lain
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-3 rise [animation-delay:60ms]">
      <h2 className="sr-only">Pertanyaan</h2>
      {fields.map((f) => {
        if (f.role === "name") {
          return (
            <Question key={f.key} label={f.label} required htmlFor="f-name" error={errors.name} hint={f.help || NAME_HINT}>
              <Input
                id="f-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                onBlur={() => setName((n) => cleanName(n))}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                required
                aria-invalid={!!errors.name}
              />
            </Question>
          );
        }
        if (f.role === "email") {
          return (
            <Question key={f.key} label={f.label} required htmlFor="f-email" error={errors.email} hint={f.help || undefined}>
              <Input
                id="f-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                aria-invalid={!!errors.email}
              />
            </Question>
          );
        }
        const group = f.type === "radio" || f.type === "checkbox" || f.type === "scale";
        return (
          <Question key={f.key} label={f.label} required={f.required} htmlFor={`f-${f.key}`} error={errors[f.key]} hint={f.help || undefined} group={group}>
            <AnswerControl f={f} value={answers[f.key]} onChange={(v) => setAnswer(f.key, v)} invalid={!!errors[f.key]} />
          </Question>
        );
      })}
      {needsCode && (
        <Question label="Kode kehadiran" required htmlFor="f-attendanceCode" error={errors.attendanceCode} hint="Diumumkan oleh penyelenggara saat acara.">
          <Input
            id="f-attendanceCode"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              clearError("attendanceCode");
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="num uppercase"
            aria-invalid={!!errors.attendanceCode}
          />
        </Question>
      )}
      {!previewOnly && <Turnstile onToken={onToken} resetKey={resetKey} />}
      {message && (
        <Notice tone="danger" announce>
          <CircleAlert />
          <span>{message}</span>
        </Notice>
      )}
      <div className="mt-2 flex items-center justify-between gap-3">
        <Button type="submit" size="lg" className="px-8" disabled={busy || previewOnly}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" /> Mengirim…
            </>
          ) : (
            "Kirim"
          )}
        </Button>
        <Button variant="ghost" className="text-seal-ink hover:bg-seal-wash hover:text-seal-ink" onClick={clearAll} disabled={busy}>
          Kosongkan formulir
        </Button>
      </div>
    </form>
  );
}

const choiceBox =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 -mx-2 text-[0.9375rem] text-ink hover:bg-paper-2/70 has-focus-visible:bg-paper-2/70";
const choiceInput = "size-[18px] shrink-0 cursor-pointer accent-[var(--seal)]";

function AnswerControl({
  f,
  value,
  onChange,
  invalid,
}: {
  f: FieldDef;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  invalid: boolean;
}) {
  const id = `f-${f.key}`;
  const text = typeof value === "string" ? value : "";
  switch (f.type) {
    case "paragraph":
      return <Textarea id={id} value={text} onChange={(e) => onChange(e.target.value)} maxLength={2000} rows={3} className="[field-sizing:content]" aria-invalid={invalid} />;
    case "dropdown":
      return (
        <Select id={id} value={text} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid}>
          <option value="">Pilih…</option>
          {f.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    case "radio":
      return (
        <div className="grid gap-0.5">
          {f.options.map((o) => (
            <label key={o} className={choiceBox}>
              <input type="radio" name={id} value={o} checked={text === o} onChange={() => onChange(o)} className={choiceInput} />
              {o}
            </label>
          ))}
        </div>
      );
    case "checkbox": {
      const picked = Array.isArray(value) ? value : [];
      return (
        <div className="grid gap-0.5">
          {f.options.map((o) => (
            <label key={o} className={choiceBox}>
              <input
                type="checkbox"
                value={o}
                checked={picked.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...picked, o] : picked.filter((x) => x !== o))}
                className={cn(choiceInput, "rounded-sm")}
              />
              {o}
            </label>
          ))}
        </div>
      );
    }
    case "scale": {
      const { min, max, minLabel, maxLabel } = f.config ?? DEFAULT_SCALE;
      const steps = Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
      return (
        <div>
          <div className="flex flex-wrap gap-1.5">
            {steps.map((n) => (
              <label key={n} className="relative">
                <input type="radio" name={id} value={n} checked={text === n} onChange={() => onChange(n)} className="peer absolute inset-0 cursor-pointer opacity-0" />
                <span className="num grid size-11 place-items-center rounded-lg border border-line-strong text-[0.9375rem] font-medium text-ink-2 transition-colors peer-checked:border-seal peer-checked:bg-seal peer-checked:text-white peer-hover:border-seal/60 peer-focus-visible:ring-3 peer-focus-visible:ring-ring">
                  {n}
                </span>
              </label>
            ))}
          </div>
          {(minLabel || maxLabel) && (
            <div className="mt-2 flex justify-between gap-4 text-xs text-muted">
              <span>{minLabel ? `${min}: ${minLabel}` : ""}</span>
              <span className="text-right">{maxLabel ? `${max}: ${maxLabel}` : ""}</span>
            </div>
          )}
        </div>
      );
    }
    case "date":
      return <Input id={id} type="date" value={text} onChange={(e) => onChange(e.target.value)} className="sm:max-w-56" aria-invalid={invalid} />;
    case "time":
      return <Input id={id} type="time" value={text} onChange={(e) => onChange(e.target.value)} className="sm:max-w-40" aria-invalid={invalid} />;
    default:
      return (
        <Input
          id={id}
          type={f.type === "email" ? "email" : "text"}
          inputMode={f.type === "number" ? "decimal" : f.type === "email" ? "email" : undefined}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          maxLength={200}
          aria-invalid={invalid}
        />
      );
  }
}
