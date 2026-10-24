"use client";

import { Download, MoreHorizontal, RefreshCw, Send, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteParticipant, resendCertificate, retryCertificatePdf, setCertificateStatus } from "@/app/forms/actions";
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
  const [open, setOpen] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") {
          setOpen(null);
          triggerRef.current?.focus();
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          // Arrow keys move between items, as expected inside role="menu".
          const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])];
          if (!items.length) return;
          e.preventDefault();
          const i = items.indexOf(document.activeElement as HTMLElement);
          items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
        }
      } else if (!ref.current?.contains(e.target as Node)) setOpen(null);
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

  const item =
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-paper-2 focus-visible:bg-paper-2 focus-visible:outline-offset-0 active:bg-paper-2 disabled:opacity-40 [&_svg]:size-4 [&_svg]:text-muted";

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const right = window.innerWidth - r.right;
          // Open upward for rows near the bottom of the viewport so the menu is never off-screen.
          const flipUp = window.innerHeight - r.bottom < 240 && r.top > 240;
          setOpen((o) => (o ? null : flipUp ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right }));
        }}
        aria-haspopup="menu"
        aria-expanded={!!open}
        aria-label={`Aksi untuk ${name}`}
        className={cn(
          "grid size-9 place-items-center rounded-md text-ink-2 transition-[background-color,transform] duration-150 hover:bg-paper-2 active:scale-[0.94] aria-expanded:bg-paper-2",
          pending && "motion-safe:animate-pulse",
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Aksi untuk ${name}`}
          style={{ top: open.top, bottom: open.bottom, right: open.right }}
          className={cn(
            "fixed z-40 w-52 rounded-lg border border-line bg-card p-1 shadow-soft rise [animation-duration:160ms]",
            open.bottom !== undefined ? "origin-bottom-right" : "origin-top-right",
          )}
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
              className={cn(item, "text-danger [&_svg]:text-danger")}
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
            className={cn(item, "text-danger [&_svg]:text-danger")}
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
