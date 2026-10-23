import { Check, Circle, Download, ExternalLink, FileWarning, MailX, ShieldBan, Users } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { PublishControls } from "@/components/publish-controls";
import { ButtonLink, Card, Notice } from "@/components/ui";
import { env } from "@/lib/env";
import { eventStats, getFormFields, getOwnedEvent, publishBlockers } from "@/lib/events";
import { formatDateTime, formatNumber } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default async function EventOverviewPage({ params }: PageProps<"/dasbor/acara/[id]">) {
  const { id } = await params;
  const { event, template } = await getOwnedEvent(id);
  const [stats, fields] = await Promise.all([eventStats(id), getFormFields(id)]);
  const blockers = publishBlockers(template);
  const formUrl = `${env.appUrl}/f/${event.slug}`;
  const base = `/dasbor/acara/${id}`;

  const steps = [
    { done: !!(template.backgroundKey || template.preset), label: "Pilih desain atau unggah desain sendiri", href: `${base}/template` },
    { done: template.fields.some((f) => f.key === "nama"), label: "Taruh kolom nama (dan QR) di template", href: `${base}/template` },
    { done: fields.length > 0, optional: true, label: "Tambah kolom form selain nama & email", href: `${base}/form` },
    {
      done: !!(event.attendanceCodeHash || event.quota || event.closesAt),
      optional: true,
      label: "Atur pengaman: kode kehadiran, jadwal, kuota",
      href: `${base}/pengaturan`,
    },
    { done: event.status !== "draft", label: "Publikasikan dan bagikan link", href: null },
  ];

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-6">
        <Card className="p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Persiapan</h2>
          <ol className="mt-4 grid gap-1">
            {steps.map((s, i) => {
              const content = (
                <>
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full ring-1",
                      s.done ? "bg-ok text-white ring-ok" : "text-muted ring-line-strong",
                    )}
                  >
                    {s.done ? <Check className="size-3.5" strokeWidth={3} /> : <span className="num text-[0.7rem]">{i + 1}</span>}
                  </span>
                  <span className={cn("text-sm", s.done ? "text-ink-2" : "font-medium text-ink")}>
                    {s.label}
                    {s.done && <span className="sr-only"> (selesai)</span>}
                  </span>
                  {s.optional && !s.done && <span className="text-xs text-muted">opsional</span>}
                </>
              );
              return (
                <li key={s.label}>
                  {s.href ? (
                    <Link href={s.href} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-paper-2 active:bg-paper-2">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-2 py-2">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="mt-5 border-t border-line pt-5">
            {blockers.length > 0 && event.status === "draft" && (
              <Notice tone="warn" className="mb-4">
                <Circle />
                <span>{blockers.join(" ")}</span>
              </Notice>
            )}
            <PublishControls eventId={id} status={event.status} blockers={blockers} />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Users} label="Sertifikat terbit" value={stats.total} />
          <Stat icon={FileWarning} label="PDF tertunda" value={stats.pending} tone={stats.pending ? "warn" : undefined} />
          <Stat icon={MailX} label="Email gagal" value={stats.emailFailed} tone={stats.emailFailed ? "warn" : undefined} />
          <Stat icon={ShieldBan} label="Dicabut" value={stats.revoked} />
        </div>

        <Card className="p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Pengaman aktif</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Kode kehadiran" value={event.attendanceCodeHash ? "Wajib" : "Tidak"} />
            <Row label="Kuota" value={event.quota ? `${formatNumber(event.quota)} peserta` : "Tanpa batas"} />
            <Row label="Form dibuka" value={event.opensAt ? formatDateTime(event.opensAt) : "Saat dipublikasikan"} />
            <Row label="Form ditutup" value={event.closesAt ? formatDateTime(event.closesAt) : "Manual"} />
          </dl>
        </Card>
      </div>

      <aside className="grid content-start gap-6">
        <Card className="overflow-hidden">
          <div className="p-5">
            <h2 className="text-xl font-semibold">Bagikan</h2>
            <p className="mt-1 text-sm text-ink-2">
              {event.status === "draft" ? "Link aktif setelah form dipublikasikan." : "Kirim link ini atau tampilkan QR saat acara."}
            </p>
            <p className="num mt-4 rounded-lg border border-line bg-paper-2 px-3 py-2 text-[0.8rem] break-all select-all">{formUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton text={formUrl} label="Salin link" />
              <ButtonLink href={`/f/${event.slug}`} target="_blank" variant="ghost" size="sm">
                <ExternalLink /> Buka
              </ButtonLink>
            </div>
          </div>
          <div className="laid border-t border-line bg-paper-2/60 p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/dasbor/acara/${id}/qr`}
              alt={`QR code menuju ${formUrl}`}
              width={240}
              height={240}
              className="mx-auto aspect-square w-48 rounded-md bg-white p-2 ring-1 ring-line"
            />
            <div className="mt-3 flex justify-center">
              <a
                href={`/api/dasbor/acara/${id}/qr?download=1`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink"
              >
                <Download className="size-4" aria-hidden /> Unduh QR (PNG)
              </a>
            </div>
          </div>
        </Card>
      </aside>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "warn";
}) {
  return (
    <Card className="p-4">
      <Icon className={cn("size-4", tone === "warn" ? "text-warn" : "text-muted")} />
      <p className={cn("num mt-3 text-2xl font-semibold", tone === "warn" ? "text-warn" : "text-ink")}>{formatNumber(value)}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
