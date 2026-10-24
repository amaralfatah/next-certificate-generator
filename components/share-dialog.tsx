"use client";

import { Download, ExternalLink, Send, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { setEventStatus } from "@/app/forms/actions";
import { CopyButton } from "@/components/copy-button";
import { Button, ButtonLink, Notice } from "@/components/ui";

/** "Bagikan": publishes a draft and hands out the link and QR, in one place. */
export function ShareDialog({ eventId, status, formUrl, formPath }: { eventId: string; status: string; formUrl: string; formPath: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const draft = status === "draft";

  const publish = () =>
    start(async () => {
      const r = await setEventStatus(eventId, "open");
      if (!r?.ok) return setError(r?.message ?? "Gagal mempublikasikan.");
      setError(null);
      await navigator.clipboard?.writeText(formUrl).catch(() => {});
    });

  return (
    <>
      <Button variant="seal" onClick={() => ref.current?.showModal()}>
        <Send /> Bagikan
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="share-title"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-line bg-card p-0 text-ink shadow-lift backdrop:bg-ink/30"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="share-title" className="text-lg font-semibold">
            Bagikan formulir
          </h2>
          <Button variant="ghost" size="sm" onClick={() => ref.current?.close()} aria-label="Tutup">
            <X />
          </Button>
        </div>
        <div className="grid gap-4 p-5">
          {draft ? (
            <>
              <p className="text-sm text-ink-2">Formulir ini masih draf. Publikasikan agar siapa pun yang punya link bisa mengisinya.</p>
              {error && (
                <Notice tone="danger" announce>
                  {error}
                </Notice>
              )}
              <Button variant="seal" size="lg" onClick={publish} disabled={pending}>
                {pending ? "Memproses…" : "Publikasikan & salin link"}
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-ink-2">Kirim link ini ke peserta, atau tampilkan QR saat acara.</p>
                <p className="num mt-3 rounded-lg border border-line bg-paper-2 px-3 py-2 text-[0.8rem] break-all select-all">{formUrl}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton text={formUrl} label="Salin link" />
                  <ButtonLink href={formPath} target="_blank" variant="ghost" size="sm">
                    <ExternalLink /> Buka
                  </ButtonLink>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-paper-2/60 p-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/forms/${eventId}/qr`}
                  alt={`QR code menuju ${formUrl}`}
                  width={240}
                  height={240}
                  className="mx-auto aspect-square w-44 rounded-md bg-white p-2 ring-1 ring-line"
                />
                <a
                  href={`/api/forms/${eventId}/qr?download=1`}
                  className="mt-2 inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-ink-2 hover:text-ink"
                >
                  <Download className="size-4" aria-hidden /> Unduh QR (PNG)
                </a>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
