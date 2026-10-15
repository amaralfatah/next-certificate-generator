import { CalendarDays, Clock, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { asc, count, eq } from "drizzle-orm";
import { CertFontFaces } from "@/components/editor/cert-font-faces";
import { ParticipantForm, type CertPreview } from "@/components/participant-form";
import { Wordmark } from "@/components/seal";
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
  if (!data || data.event.status === "draft") return { title: "Form tidak ditemukan", robots: { index: false } };
  return {
    title: `Sertifikat ${data.event.title}`,
    description: `Isi form untuk mendapatkan sertifikat ${data.event.title} dari ${data.event.organizerLabel}.`,
    robots: { index: false },
  };
}

export default async function PublicFormPage({ params }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  const data = await loadEvent(slug);
  if (!data || data.event.status === "draft") notFound();
  const { event, fields, issued, template } = data;
  const availability = formAvailability(event, issued);
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
      tanggal: formatEventDate(event.date),
      penyelenggara: event.organizerLabel,
      nomor: `${event.numberPrefix}-${event.date.slice(0, 4)}-•••••`,
    },
  };

  return (
    <div className="laid min-h-dvh pb-[env(safe-area-inset-bottom)]">
      <CertFontFaces />
      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-16">
        <header className="rise">
          <p className="eyebrow">{event.organizerLabel}</p>
          <h1 className="mt-2 text-[2rem] leading-[1.08] font-semibold">{event.title}</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-2">
            <CalendarDays className="size-4 text-muted" aria-hidden />
            {formatEventDate(event.date)}
          </p>
          {event.description && <p className="mt-3 text-[0.95rem] leading-relaxed whitespace-pre-line text-ink-2">{event.description}</p>}
        </header>

        <div className="frame mt-6 bg-card px-5 py-6 rise [animation-delay:80ms]">
          {availability === "open" ? (
            <>
              <h2 className="sr-only">Form sertifikat</h2>
              <ParticipantForm
                slug={slug}
                eventTitle={event.title}
                needsCode={!!event.attendanceCodeHash}
                emailEnabled={!!env.resend}
                preview={preview}
                fields={fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required, options: f.options }))}
              />
            </>
          ) : (
            <div className="py-6 text-center">
              {availability === "not_yet" ? (
                <Clock className="mx-auto size-10 text-warn" strokeWidth={1.5} />
              ) : (
                <Lock className="mx-auto size-10 text-muted" strokeWidth={1.5} />
              )}
              <h2 className="mt-4 text-2xl font-semibold">
                {availability === "not_yet" ? "Form belum dibuka" : availability === "full" ? "Kuota sudah penuh" : "Form sudah ditutup"}
              </h2>
              <p className="mt-2 text-sm text-ink-2">
                {availability === "not_yet" && event.opensAt
                  ? `Form dibuka ${formatDateTime(event.opensAt)} WIB.`
                  : "Hubungi penyelenggara jika kamu merasa berhak mendapatkan sertifikat."}
              </p>
            </div>
          )}
        </div>

        <footer className="mt-8 flex flex-col items-center gap-2 text-xs text-muted">
          <Link href="/" className="opacity-80 hover:opacity-100" aria-label="Piagam">
            <Wordmark className="scale-75" />
          </Link>
          <p className="text-center">
            Data kamu hanya dapat dilihat oleh {event.organizerLabel}. Halaman verifikasi hanya menampilkan nama, acara, dan tanggal.
          </p>
        </footer>
      </main>
    </div>
  );
}
