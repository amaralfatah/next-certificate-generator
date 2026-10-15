"use client";

import { ArrowLeft, CircleAlert, Download, Loader2, Mail, RotateCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Seal } from "@/components/seal";
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/turnstile";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { cleanName, type FieldDef, validateSubmission } from "@/lib/forms";
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
      className="relative mt-5 overflow-hidden rounded-[3px] bg-white shadow-[0_14px_30px_-16px_oklch(0.27_0.04_255/0.5),0_0_0_1px_oklch(0.27_0.04_255/0.08)]"
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

type Success = { number: string; pending: boolean; downloadUrl: string; retryUrl: string; verifyUrl: string };
type Phase = "fill" | "confirm" | "done" | "duplicate";

export function ParticipantForm({
  slug,
  eventTitle,
  fields,
  needsCode,
  emailEnabled,
  preview,
}: {
  slug: string;
  eventTitle: string;
  fields: FieldDef[];
  needsCode: boolean;
  emailEnabled: boolean;
  preview?: CertPreview;
}) {
  const [phase, setPhase] = useState<Phase>("fill");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [result, setResult] = useState<Success | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const onToken = useCallback((t: string | null) => setToken(t), []);

  const review = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const v = validateSubmission(fields, { name, email, answers });
    const errs = { ...v.errors };
    if (needsCode && !code.trim()) errs.attendanceCode = "Kode kehadiran wajib diisi.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setName(v.value.name);
    setPhase("confirm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (TURNSTILE_SITE_KEY && !token) {
      setMessage("Tunggu verifikasi keamanan selesai, lalu coba lagi.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/f/${slug}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, answers, attendanceCode: needsCode ? code : undefined, turnstileToken: token }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data);
        setPhase("done");
        return;
      }
      setResetKey((k) => k + 1);
      if (data.code === "duplicate") {
        setPhase("duplicate");
        return;
      }
      setErrors(data.fieldErrors ?? {});
      setMessage(data.message ?? "Terjadi kesalahan. Coba lagi.");
      if (data.fieldErrors || data.code === "bad_code") setPhase("fill");
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

  if (phase === "done" && result) {
    return (
      <div className="text-center rise">
        {preview && !result.pending ? (
          <div className="relative">
            <CertificatePreview preview={preview} values={{ ...preview.values, ...answers, nama: name, nomor: result.number }} />
            <Seal className="stamp-in absolute -top-4 -right-3 size-16 drop-shadow-[0_8px_14px_oklch(0.48_0.16_32/0.35)] [animation-delay:200ms]" label="✓" />
          </div>
        ) : (
          <div className="relative mx-auto w-fit">
            <Seal className="stamp-in mx-auto size-24 drop-shadow-[0_8px_14px_oklch(0.48_0.16_32/0.35)]" label="✓" />
          </div>
        )}
        <h2 className="mt-6 text-3xl font-semibold">{result.pending ? "Data tersimpan" : "Sertifikat siap!"}</h2>
        <p className="num mt-2 text-sm text-muted">No. {result.number}</p>
        {result.pending ? (
          <>
            <Notice tone="warn" className="mt-6 text-left">
              <CircleAlert />
              <span>Sertifikat belum berhasil dibuat. Data kamu sudah aman tersimpan; tekan tombol di bawah untuk mencoba lagi.</span>
            </Notice>
            <Button className="mt-5 w-full" size="lg" onClick={retry} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <RotateCw />} Coba buat lagi
            </Button>
          </>
        ) : (
          <>
            <a
              href={result.downloadUrl}
              className="mt-7 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-seal text-base font-semibold text-white shadow-[0_1px_0_0_oklch(1_0_0/0.2)_inset,0_8px_20px_-8px_oklch(0.48_0.16_32/0.6)] transition-colors hover:bg-seal-ink"
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
        {message && <p className="mt-3 text-sm font-medium text-seal-ink">{message}</p>}
        <a href={result.verifyUrl} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
          <ShieldCheck className="size-4" aria-hidden /> Lihat halaman verifikasi
        </a>
      </div>
    );
  }

  if (phase === "duplicate") {
    return (
      <div className="rise">
        <h2 className="text-2xl font-semibold">Email ini sudah terdaftar</h2>
        <p className="mt-2 text-ink-2">
          <b className="break-all">{email}</b> sudah menerima sertifikat untuk {eventTitle}. Setiap email hanya mendapat satu sertifikat.
        </p>
        <Turnstile onToken={onToken} resetKey={resetKey} />
        {resendMsg ? (
          <Notice tone="ok" className="mt-5">
            {resendMsg}
          </Notice>
        ) : (
          <Button className="mt-5 w-full" size="lg" onClick={resend} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Mail />} Kirim ulang ke email ini
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

  if (phase === "confirm") {
    return (
      <div className="rise">
        <p className="eyebrow">Konfirmasi nama</p>
        <h2 className="mt-2 text-2xl font-semibold">Pastikan nama sudah benar</h2>
        <p className="mt-1 text-sm text-ink-2">Nama tidak bisa diubah setelah dikirim. Beginilah sertifikatmu akan tercetak:</p>
        {preview ? (
          <CertificatePreview preview={preview} values={{ ...preview.values, ...answers, nama: name }} />
        ) : (
          <div className="frame laid mt-5 bg-card px-4 py-8 text-center">
            <p className="text-[0.65rem] tracking-[0.3em] text-muted uppercase">diberikan kepada</p>
            <p
              className="mt-3 text-[1.9rem] leading-tight break-words text-ink"
              style={{ fontFamily: "var(--font-display-face)", fontStyle: "italic", fontVariationSettings: '"opsz" 144, "SOFT" 100' }}
            >
              {name}
            </p>
            <div className="mx-auto mt-3 h-px w-1/2 bg-gold" />
          </div>
        )}
        <dl className="mt-5 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="truncate font-medium">{email}</dd>
          </div>
          {fields
            .filter((f) => answers[f.key])
            .map((f) => (
              <div key={f.key} className="flex justify-between gap-4">
                <dt className="text-muted">{f.label}</dt>
                <dd className="truncate font-medium">{answers[f.key]}</dd>
              </div>
            ))}
        </dl>
        <Turnstile onToken={onToken} resetKey={resetKey} />
        {message && (
          <Notice tone="seal" className="mt-5">
            <CircleAlert />
            <span>{message}</span>
          </Notice>
        )}
        <Button className="mt-6 w-full" size="lg" variant="seal" onClick={submit} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" /> Membuat sertifikat…
            </>
          ) : (
            "Nama sudah benar, kirim"
          )}
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setPhase("fill")} disabled={busy}>
          <ArrowLeft /> Perbaiki data
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={review} noValidate className="grid gap-5">
      <Field
        label="Nama lengkap"
        htmlFor="f-name"
        error={errors.name}
        hint="Tulis sesuai yang ingin dicetak di sertifikat, termasuk gelar bila perlu."
      >
        <Input
          id="f-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setName((n) => cleanName(n))}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          required
          aria-invalid={!!errors.name}
        />
      </Field>
      <Field
        label="Email"
        htmlFor="f-email"
        error={errors.email}
        hint={emailEnabled ? "Salinan sertifikat dikirim ke sini." : "Satu email hanya untuk satu sertifikat."}
      >
        <Input
          id="f-email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={!!errors.email}
        />
      </Field>
      {fields.map((f) => (
        <Field
          key={f.key}
          label={
            <>
              {f.label}
              {!f.required && <span className="ml-1 font-normal text-muted">(opsional)</span>}
            </>
          }
          htmlFor={`f-${f.key}`}
          error={errors[f.key]}
        >
          {f.type === "select" ? (
            <Select
              id={`f-${f.key}`}
              value={answers[f.key] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [f.key]: e.target.value }))}
              aria-invalid={!!errors[f.key]}
            >
              <option value="">Pilih…</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id={`f-${f.key}`}
              type={f.type === "email" ? "email" : "text"}
              inputMode={f.type === "number" ? "decimal" : f.type === "email" ? "email" : undefined}
              value={answers[f.key] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [f.key]: e.target.value }))}
              maxLength={200}
              aria-invalid={!!errors[f.key]}
            />
          )}
        </Field>
      ))}
      {needsCode && (
        <Field label="Kode kehadiran" htmlFor="f-attendanceCode" error={errors.attendanceCode} hint="Diumumkan oleh penyelenggara saat acara.">
          <Input
            id="f-attendanceCode"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="num uppercase"
            aria-invalid={!!errors.attendanceCode}
          />
        </Field>
      )}
      {message && (
        <Notice tone="seal">
          <CircleAlert />
          <span>{message}</span>
        </Notice>
      )}
      <Button type="submit" size="lg" className="mt-1 w-full">
        Lanjut
      </Button>
    </form>
  );
}
