import { ChevronLeft, ChevronRight, FileDown, Search } from "lucide-react";
import Link from "next/link";
import { ParticipantActions } from "@/components/participant-actions";
import { Badge, ButtonLink, Card, Input } from "@/components/ui";
import { env } from "@/lib/env";
import { getOwnedEvent } from "@/lib/events";
import { formatDateTime, formatNumber } from "@/lib/i18n";
import { listParticipants, PAGE_SIZE } from "@/lib/participants";
import { signToken } from "@/lib/security/crypto";

const EMAIL_BADGE = {
  sent: { tone: "ok", label: "Terkirim" },
  failed: { tone: "seal", label: "Gagal" },
  pending: { tone: "neutral", label: "Antre" },
  skipped: { tone: "neutral", label: "Dilewati" },
} as const;

export default async function ParticipantsPage({ params, searchParams }: PageProps<"/dasbor/acara/[id]/peserta">) {
  const { id } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const page = Math.max(1, Number(sp.hal) || 1);
  await getOwnedEvent(id);
  const { rows, total } = await listParticipants(id, q, page);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { hal: String(p) } : {}) })}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative w-full sm:max-w-sm" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="q" className="sr-only">
            Cari peserta
          </label>
          <Input id="q" name="q" defaultValue={q} placeholder="Cari nama, email, atau nomor" className="pl-9" />
        </form>
        <ButtonLink href={`/api/dasbor/acara/${id}/peserta-csv`} variant="outline" prefetch={false}>
          <FileDown /> Ekspor CSV
        </ButtonLink>
      </div>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {q ? `${formatNumber(total)} hasil untuk "${q}"` : `${formatNumber(total)} peserta`}
      </p>

      <Card className="mt-3 overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-ink-2">
            {q ? "Tidak ada peserta yang cocok." : "Belum ada peserta. Bagikan link form untuk mulai menerima pendaftaran."}
          </p>
        ) : (
          <div className="relative overflow-x-auto">
            {/* relative: contains the sr-only header text, which otherwise escapes the scroller and widens the page on mobile */}
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-2/70 text-left text-xs tracking-wide text-muted uppercase">
                  <th className="px-4 py-3 font-semibold">Peserta</th>
                  <th className="px-4 py-3 font-semibold">Nomor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Waktu</th>
                  <th className="w-12 px-2 py-3">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ sub, cert }) => (
                  <tr key={cert.id} className="border-b border-line last:border-0 hover:bg-paper-2/40">
                    <td className="max-w-64 px-4 py-3">
                      <p className="truncate font-semibold text-ink">{sub.name}</p>
                      <p className="truncate text-xs text-muted">{sub.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/v/${encodeURIComponent(cert.number)}`} target="_blank" className="num text-xs whitespace-nowrap text-ink-2 hover:text-seal-ink hover:underline">
                        {cert.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {cert.status === "revoked" ? (
                        <Badge tone="seal">Dicabut</Badge>
                      ) : cert.pdfKey ? (
                        <Badge tone="ok">Valid</Badge>
                      ) : (
                        <Badge tone="warn">PDF tertunda</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={EMAIL_BADGE[cert.emailStatus].tone}>{EMAIL_BADGE[cert.emailStatus].label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted">{formatDateTime(sub.createdAt)}</td>
                    <td className="px-2 py-3">
                      <ParticipantActions
                        certificateId={cert.id}
                        status={cert.status}
                        hasPdf={!!cert.pdfKey}
                        name={sub.name}
                        downloadUrl={
                          cert.pdfKey && cert.status === "valid"
                            ? `/api/c/${encodeURIComponent(cert.number)}?t=${signToken(env.authSecret, "download", cert.number, 3600)}`
                            : null
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Halaman">
          <span className="text-muted">
            Halaman <span className="num">{page}</span> dari <span className="num">{pages}</span>
          </span>
          <div className="flex gap-2">
            <ButtonLink href={href(page - 1)} variant="outline" size="sm" aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={page <= 1 ? "pointer-events-none opacity-40" : ""}>
              <ChevronLeft /> Sebelumnya
            </ButtonLink>
            <ButtonLink href={href(page + 1)} variant="outline" size="sm" aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} className={page >= pages ? "pointer-events-none opacity-40" : ""}>
              Berikutnya <ChevronRight />
            </ButtonLink>
          </div>
        </nav>
      )}
    </main>
  );
}
