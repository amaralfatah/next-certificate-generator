import { CalendarDays, Mail, Plus, Users } from "lucide-react";
import { createForm } from "@/app/forms/actions";
import type { Metadata } from "next";
import Link from "next/link";
import { CertificateThumb } from "@/components/certificate-thumb";
import { CertFontFaces } from "@/components/editor/cert-font-faces";
import { AccountMenu } from "@/components/account-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Seal, Wordmark } from "@/components/seal";
import { AvailabilityBadge } from "@/components/status-badge";
import { Button, Card } from "@/components/ui";
import { requireOrganizer } from "@/lib/auth/session";
import { emailsSentToday } from "@/lib/certificates/issue";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { listEvents } from "@/lib/events";
import { formAvailability } from "@/lib/forms";
import { formatEventDate, formatNumber } from "@/lib/i18n";

export const metadata: Metadata = { title: "Formulir" };

function NewFormButton({ className }: { className?: string }) {
  return (
    <form action={createForm} className={className}>
      <Button type="submit" variant="seal">
        <Plus /> Formulir baru
      </Button>
    </form>
  );
}

export default async function DashboardPage() {
  const organizer = await requireOrganizer();
  const [rows, sentToday] = await Promise.all([listEvents(organizer.id), emailsSentToday(await db())]);
  const openCount = rows.filter(({ event, issued }) => formAvailability(event, issued) === "open").length;

  return (
    <>
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/forms" aria-label="Semua formulir">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <AccountMenu name={organizer.name} email={organizer.email} />
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {rows.length > 0 && <CertFontFaces />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Formulir</h1>
          {rows.length > 0 && (
            <p className="mt-1 text-ink-2">
              <span className="num">{formatNumber(rows.length)}</span> formulir
              {openCount > 0 && (
                <>
                  {" · "}
                  <span className="num">{formatNumber(openCount)}</span> menerima respons
                </>
              )}
            </p>
          )}
        </div>
        <NewFormButton />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-2">
        <span className="inline-flex items-center gap-2">
          <Mail className="size-4 text-muted" aria-hidden />
          Email terkirim hari ini:{" "}
          <b className="num text-ink">
            {formatNumber(sentToday)} / {formatNumber(env.emailDailyLimit)}
          </b>
        </span>
        {!env.mailEnabled && <span className="text-warn">Email belum dikonfigurasi; peserta tetap bisa mengunduh langsung.</span>}
      </div>

      {rows.length === 0 ? (
        <Card className="mt-10 flex flex-col items-center px-6 py-16 text-center">
          <Seal className="size-16 -rotate-8 opacity-90" />
          <h2 className="mt-6 text-2xl font-bold">Belum ada formulir</h2>
          <p className="mt-2 max-w-md text-ink-2">
            Buat formulir untuk acaramu, tulis pertanyaannya, lalu bagikan link-nya. Sertifikat sudah siap dengan desain bawaan.
          </p>
          <NewFormButton className="mt-6" />
        </Card>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ event, issued, template }, i) => (
            <li key={event.id} className="rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <Link
                href={`/forms/${event.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-lift active:scale-[0.99] motion-safe:hover:-translate-y-0.5"
              >
                <div className="border-b border-line bg-paper-2 p-3">
                  <CertificateThumb event={event} template={template} className="rounded-[3px] shadow-soft" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div>
                    <AvailabilityBadge value={formAvailability(event, issued)} />
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-xl leading-snug font-bold group-hover:text-seal-ink">{event.title}</h2>
                  <p className="mt-1 line-clamp-1 text-sm text-muted">{event.organizerLabel}</p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-4 text-sm text-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4 text-muted" aria-hidden />
                      {formatEventDate(event.date, event.endDate)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-4 text-muted" aria-hidden />
                      <span className="num">{formatNumber(issued)}</span> respons
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
    </>
  );
}
