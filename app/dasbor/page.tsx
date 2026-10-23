import { CalendarDays, Mail, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CertificateThumb } from "@/components/certificate-thumb";
import { CertFontFaces } from "@/components/editor/cert-font-faces";
import { Seal } from "@/components/seal";
import { AvailabilityBadge } from "@/components/status-badge";
import { ButtonLink, Card } from "@/components/ui";
import { requireOrganizer } from "@/lib/auth/session";
import { emailsSentToday } from "@/lib/certificates/issue";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { listEvents } from "@/lib/events";
import { formAvailability } from "@/lib/forms";
import { formatEventDate, formatNumber } from "@/lib/i18n";

export const metadata: Metadata = { title: "Dasbor" };

export default async function DashboardPage() {
  const organizer = await requireOrganizer();
  const [rows, sentToday] = await Promise.all([listEvents(organizer.id), emailsSentToday(await db())]);
  const firstName = organizer.name.split(" ")[0];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {rows.length > 0 && <CertFontFaces />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dasbor penyelenggara</p>
          <h1 className="mt-2 text-4xl font-semibold">Halo, {firstName}.</h1>
        </div>
        <ButtonLink href="/dasbor/acara/baru" variant="seal">
          <Plus /> Acara baru
        </ButtonLink>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-2">
        <span className="inline-flex items-center gap-2">
          <Mail className="size-4 text-muted" aria-hidden />
          Email terkirim hari ini:{" "}
          <b className="num text-ink">
            {formatNumber(sentToday)} / {formatNumber(env.emailDailyLimit)}
          </b>
        </span>
        {!env.resend && <span className="text-warn">Email belum dikonfigurasi; peserta tetap bisa mengunduh langsung.</span>}
      </div>

      {rows.length === 0 ? (
        <Card className="laid mt-10 flex flex-col items-center px-6 py-16 text-center">
          <Seal className="size-16 -rotate-8 opacity-90" />
          <h2 className="mt-6 text-2xl font-semibold">Belum ada acara</h2>
          <p className="mt-2 max-w-md text-ink-2">
            Buat acara pertama: unggah desain sertifikat, taruh kolom nama, lalu bagikan link form ke peserta. Biasanya selesai
            dalam beberapa menit.
          </p>
          <ButtonLink href="/dasbor/acara/baru" className="mt-6" variant="seal">
            <Plus /> Buat acara
          </ButtonLink>
        </Card>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ event, issued, template }, i) => (
            <li key={event.id} className="rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <Link
                href={`/dasbor/acara/${event.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-[0_14px_34px_-14px_oklch(0.27_0.04_255/0.3)] active:scale-[0.99] motion-safe:hover:-translate-y-0.5"
              >
                <div className="border-b border-line bg-paper-2 p-3">
                  <CertificateThumb event={event} template={template} className="rounded-[3px] shadow-[0_6px_16px_-8px_oklch(0.27_0.04_255/0.4)]" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <AvailabilityBadge value={formAvailability(event, issued)} />
                    <span className="num text-xs text-muted">{event.numberPrefix}</span>
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-xl leading-snug font-semibold group-hover:text-seal-ink">{event.title}</h2>
                  <p className="mt-1 line-clamp-1 text-sm text-muted">{event.organizerLabel}</p>
                  <div className="mt-auto flex items-center gap-4 pt-4 text-sm text-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4 text-muted" aria-hidden />
                      {formatEventDate(event.date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5" title="Sertifikat terbit">
                      <Users className="size-4 text-muted" aria-hidden />
                      <span className="num">{formatNumber(issued)}</span>
                      <span className="sr-only">sertifikat terbit</span>
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
