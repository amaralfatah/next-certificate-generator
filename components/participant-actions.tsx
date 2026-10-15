"use client";

import { Download, MoreHorizontal, RefreshCw, Send, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteParticipant, resendCertificate, retryCertificatePdf, setCertificateStatus } from "@/app/dasbor/actions";
import { cn } from "@/lib/utils";

export function ParticipantActions({
  certificateId,
  status,
  hasPdf,
  downloadUrl,
  name,
}: {
  certificateId: string;
  status: "valid" | "revoked";
  hasPdf: boolean;
  downloadUrl: string | null;
  name: string;
}) {
  // Fixed-position menu so the table's horizontal scroll container can't clip it.
  const [open, setOpen] = useState<{ top: number; right: number } | null>(null);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(null);
    };
    const dismiss = () => setOpen(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const run = (fn: () => Promise<{ message?: string } | undefined>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setOpen(null);
    start(async () => {
      const r = await fn();
      if (r?.message) setToast(r.message);
    });
  };

  const item = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-2 disabled:opacity-40 [&_svg]:size-4 [&_svg]:text-muted";

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOpen((o) => (o ? null : { top: r.bottom + 4, right: window.innerWidth - r.right }));
        }}
        aria-haspopup="menu"
        aria-expanded={!!open}
        aria-label={`Aksi untuk ${name}`}
        className={cn("grid size-8 place-items-center rounded-md text-ink-2 hover:bg-paper-2", pending && "animate-pulse")}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div
          role="menu"
          style={{ top: open.top, right: open.right }}
          className="fixed z-40 w-52 origin-top-right rounded-lg border border-line bg-card p-1 shadow-[0_12px_32px_-8px_oklch(0.27_0.04_255/0.3)] rise [animation-duration:160ms]"
        >
          {downloadUrl ? (
            <a role="menuitem" href={downloadUrl} className={item}>
              <Download /> Unduh PDF
            </a>
          ) : null}
          {!hasPdf && (
            <button role="menuitem" className={item} onClick={() => run(() => retryCertificatePdf(certificateId))}>
              <RefreshCw /> Buat ulang PDF
            </button>
          )}
          <button
            role="menuitem"
            className={item}
            disabled={status === "revoked"}
            onClick={() => run(() => resendCertificate(certificateId))}
          >
            <Send /> Kirim ulang email
          </button>
          {status === "valid" ? (
            <button
              role="menuitem"
              className={cn(item, "text-seal-ink [&_svg]:text-seal-ink")}
              onClick={() =>
                run(
                  () => setCertificateStatus(certificateId, "revoked"),
                  `Cabut sertifikat ${name}? Halaman verifikasi akan menampilkan "Dicabut" dan PDF tidak bisa diunduh.`,
                )
              }
            >
              <ShieldBan /> Cabut sertifikat
            </button>
          ) : (
            <button role="menuitem" className={item} onClick={() => run(() => setCertificateStatus(certificateId, "valid"))}>
              <ShieldCheck /> Pulihkan sertifikat
            </button>
          )}
          <div className="my-1 h-px bg-line" />
          <button
            role="menuitem"
            className={cn(item, "text-seal-ink [&_svg]:text-seal-ink")}
            onClick={() =>
              run(
                () => deleteParticipant(certificateId),
                `Hapus entri ${name}? Sertifikatnya ikut terhapus dan nomornya tidak dipakai ulang. Peserta bisa mengisi form lagi dengan email yang sama (mis. untuk memperbaiki nama).`,
              )
            }
          >
            <Trash2 /> Hapus entri
          </button>
        </div>
      )}
      {toast && (
        <div role="status" className="fixed right-4 bottom-4 z-50 max-w-sm rounded-lg bg-ink px-4 py-3 text-sm text-paper shadow-lg rise">
          {toast}
        </div>
      )}
    </div>
  );
}
