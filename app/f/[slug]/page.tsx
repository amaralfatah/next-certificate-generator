import { Building2, CalendarDays, Clock, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { asc, count, eq } from "drizzle-orm";
import { CertFontFaces } from "@/components/editor/cert-font-faces";
import { ParticipantForm, type CertPreview } from "@/components/participant-form";
import { Mark } from "@/components/seal";
import { currentOrganizer } from "@/lib/auth/session";
import { db, events, formFields, submissions, templates } from "@/lib/db";
import { env } from "@/lib/env";
import { formAvailability } from "@/lib/forms";
import { getPreset } from "@/lib/pdf/presets";
import { storage } from "@/lib/storage";
import { formatDateTime, formatEventDate } from "@/lib/i18n";

const loadEvent = cache(async (slug: string) => {
  const database = await db();
  const [event] = await database.select().from(events).where(eq(events.slug, slug));
  if (!event) return null;
  const [fields, [{ issued }], [template]] = await Promise.all([
    database.select().from(formFields).where(eq(formFields.eventId, event.id)).orderBy(asc(formFields.position)),
    database.select({ issued: count() }).from(submissions).where(eq(submissions.eventId, event.id)),
    database.select().from(templates).where(eq(templates.eventId, event.id)),
  ]);
  return { event, fields, issued, template };
});

export async function generateMetadata({ params }: PageProps<"/f/[slug]">): Promise<Metadata> {
  const data = await loadEvent((await params).slug);
  if (!data || data.event.status === "draft") return { title: "Formulir tidak ditemukan", robots: { index: false } };
  return {
    title: data.event.title,
    description: `Formulir ${data.event.title} dari ${data.event.organizerLabel}.`,
    robots: { index: false },
  };
}

export default async function PublicFormPage({ params, searchParams }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  const data = await loadEvent(slug);
  if (!data) notFound();
  const { event, fields, issued, template } = data;
  // Pratinjau: the owner sees the form as participants will, drafts included, but cannot send it.
  const previewOnly = (await searchParams).preview === "1" && (await currentOrganizer())?.id === event.organizerId;
  if (event.status === "draft" && !previewOnly) notFound();
  const availability = previewOnly ? "open" : formAvailability(event, issued);
  const preset = template.backgroundKey ? null : getPreset(template.preset);
  const preview: CertPreview = {
    widthPt: template.widthPt,
    heightPt: template.heightPt,
    backgroundUrl: template.backgroundKey ? await storage().signedGetUrl(template.backgroundKey, 3600) : null,
    shapes: preset?.shapes,
    // The QR is unique per certificate; the preview leaves it out.
    fields: template.fields.filter((f) => f.key !== "qr"),
    values: {
      acara: event.title,
      tanggal: formatEventDate(event.date, event.endDate),
      penyelenggara: event.organizerLabel,
      nomor: `${event.numberPrefix}-${event.date.slice(0, 4)}-•••••`,
    },
  };

  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <CertFontFaces />
      <main className="mx-auto grid w-full max-w-[40rem] flex-1 content-start gap-3 px-3 pt-4 pb-10 sm:px-4 sm:pt-8">
        {previewOnly && (
          <p className="rounded-lg bg-ink px-4 py-2.5 text-center text-sm text-paper">Pratinjau. Beginilah formulir ini terlihat oleh peserta, tetapi jawaban tidak dikirim.</p>
        )}
        {/* The header card: the event is the form's title. */}
        <header className="overflow-hidden rounded-xl border border-line bg-card rise">
          <div className="px-5 pt-5 pb-6 sm:px-6">
            <h1 className="text-[2rem] leading-[1.1] font-bold break-words">{event.title}</h1>
            {event.description && <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-2">{event.description}</p>}
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.9375rem] text-ink-2">
              <div className="flex min-w-0 items-center gap-2">
                <dt className="sr-only">Penyelenggara</dt>
                <Building2 className="size-4 shrink-0 text-muted" aria-hidden />
                <dd className="min-w-0 truncate">{event.organizerLabel}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="sr-only">Tanggal</dt>
                <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden />
                <dd>
                  <time dateTime={event.date}>{formatEventDate(event.date, event.endDate)}</time>
                </dd>
              </div>
            </dl>
          </div>
          {availability === "open" && (!!event.attendanceCodeHash || fields.some((f) => f.required || f.role)) && (
            <p className="border-t border-line px-5 py-3 text-sm text-ink-2 sm:px-6">
              <span className="text-danger" aria-hidden>
                *
              </span>{" "}
              Wajib diisi
            </p>
          )}
        </header>

        {availability === "open" ? (
          <ParticipantForm
            slug={slug}
            eventTitle={event.title}
            needsCode={!!event.attendanceCodeHash}
            emailEnabled={!!env.mailEnabled}
            preview={preview}
            previewOnly={previewOnly}
            fields={fields.map((f) => ({
              key: f.key,
              label: f.label,
              type: f.type,
              required: f.required,
              options: f.options,
              role: f.role,
              help: f.help,
              config: f.config,
            }))}
          />
        ) : (
          <section className="rounded-xl border border-line bg-card px-5 py-6 rise [animation-delay:60ms] sm:px-6">
            <div className="flex items-start gap-3">
              {availability === "not_yet" ? (
                <Clock className="mt-1 size-5 shrink-0 text-warn" aria-hidden />
              ) : (
                <Lock className="mt-1 size-5 shrink-0 text-muted" aria-hidden />
              )}
              <div>
                <h2 className="text-xl font-semibold">
                  {availability === "not_yet" ? "Formulir belum dibuka" : "Formulir ini tidak lagi menerima jawaban"}
                </h2>
                <p className="mt-1 text-[0.9375rem] text-ink-2">
                  {availability === "not_yet" && event.opensAt
                    ? `Formulir dibuka ${formatDateTime(event.opensAt)} WIB.`
                    : `Hubungi ${event.organizerLabel} jika kamu merasa perlu mengisinya.`}
                </p>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-2 grid gap-3 px-1 text-sm leading-relaxed text-ink-2">
          <p>Jangan kirim kata sandi lewat formulir ini.</p>
          <p className="text-center">
            Formulir ini dibuat oleh penyelenggara, bukan oleh Sararia Certificates. -{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
              Syarat layanan
            </Link>{" "}
            -{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
              Kebijakan privasi
            </Link>
          </p>
          <Link href="/" className="mx-auto inline-flex items-center gap-1.5 rounded-md py-2 text-sm font-semibold text-muted transition-colors hover:text-ink">
            <Mark className="size-4" />
            Sararia Certificates
          </Link>
        </footer>
      </main>
    </div>
  );
}
