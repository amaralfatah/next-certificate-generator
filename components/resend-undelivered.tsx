"use client";

import { Loader2, MailWarning, Send } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { resendUndelivered } from "@/app/forms/actions";
import { Button, Notice } from "@/components/ui";
import { formatNumber } from "@/lib/i18n";

/** Shown on Respons while some certificates never reached their participant. One press retries them in bulk. */
export function ResendUndelivered({ eventId, count, showLink }: { eventId: string; count: number; showLink: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; message?: string } | null>(null);

  if (count === 0) {
    // Everything went through on the last press: keep the good news visible until the next navigation.
    return result?.ok && result.message ? (
      <Notice tone="ok" announce>
        {result.message}
      </Notice>
    ) : null;
  }

  return (
    <Notice tone="warn" className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <MailWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">
            <span className="num">{formatNumber(count)}</span> sertifikat belum sampai ke pesertanya
          </p>
          <p className="mt-0.5" role={result ? "status" : undefined}>
            {result?.message ?? "Emailnya gagal terkirim atau PDF-nya belum jadi. Peserta tetap bisa mengunduh dari halaman formulir."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 pl-7 sm:pl-0">
        {showLink && (
          <Link href="?view=people&status=undelivered" className="rounded-lg px-3 py-2 text-sm font-medium underline-offset-4 hover:underline">
            Lihat
          </Link>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => start(async () => setResult((await resendUndelivered(eventId)) ?? null))}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Send />}
          {pending ? "Mengirim…" : "Kirim ulang semua"}
        </Button>
      </div>
    </Notice>
  );
}
