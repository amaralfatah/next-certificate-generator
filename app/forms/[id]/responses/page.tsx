import { ChevronLeft, ChevronRight, FileDown, Inbox, Search, Users } from "lucide-react";
import Link from "next/link";
import { AcceptingToggle } from "@/components/accepting-toggle";
import { ParticipantActions } from "@/components/participant-actions";
import { ResponseSummary } from "@/components/response-summary";
import { Badge, ButtonLink, Card, Input } from "@/components/ui";
import { env } from "@/lib/env";
import { getFormFields, getOwnedEvent } from "@/lib/events";
import { answerText, formAvailability } from "@/lib/forms";
import { formatDateTime, formatNumber } from "@/lib/i18n";
import { allAnswers, listParticipants, PAGE_SIZE } from "@/lib/participants";
import { summarize } from "@/lib/responses";
import { cn } from "@/lib/utils";
import { signToken } from "@/lib/security/crypto";

const EMAIL_BADGE = {
  sent: { tone: "ok", label: "Terkirim" },
  failed: { tone: "danger", label: "Gagal" },
  pending: { tone: "neutral", label: "Antre" },
  skipped: { tone: "neutral", label: "Dilewati" },
} as const;

export default async function ResponsesPage({ params, searchParams }: PageProps<"/forms/[id]/responses">) {
  const { id } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const view = sp.view === "people" ? "people" : "summary";
  const { event } = await getOwnedEvent(id);
  const [fields, answers] = await Promise.all([getFormFields(id), allAnswers(id)]);
  const totalResponses = answers.length;
  const availability = formAvailability(event, totalResponses);
  const autoClosedReason =
    availability === "full"
      ? "Batas jumlah respons sudah tercapai, jadi formulir tertutup otomatis. Ubah batasnya di Setelan."
      : availability === "closed"
        ? "Waktu berhenti menerima respons sudah lewat. Ubah jadwalnya di Setelan."
        : availability === "not_yet"
          ? "Formulir baru mulai menerima respons sesuai jadwal di Setelan."
          : null;
  const custom = fields.filter((f) => !f.role);
  const tabHref = (v: string) => (v === "people" ? "?view=people" : "?");

  return (
    <main className="mx-auto grid w-full max-w-3xl grid-cols-[minmax(0,1fr)] gap-4 px-4 py-6 sm:px-6">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="num text-3xl font-bold">{formatNumber(totalResponses)}</p>
          <p className="text-sm text-muted">respons</p>
        </div>
        {event.status !== "draft" ? (
          <AcceptingToggle eventId={id} open={event.status === "open"} autoClosedReason={autoClosedReason} />
        ) : (
          <p className="text-sm text-muted">Masih draf</p>
        )}
      </Card>

      {totalResponses === 0 ? (
        // Nothing to summarise yet: one clear empty state instead of a "0 dari 0" card per question.
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <Inbox className="size-7 text-muted" aria-hidden />
          <p className="mt-3 font-semibold">Belum ada respons</p>
          <p className="mt-1 max-w-sm text-sm text-ink-2">
            {event.status === "draft"
              ? "Tekan Bagikan untuk mempublikasikan formulir dan mendapatkan link-nya."
              : "Jawaban yang masuk akan muncul di sini, lengkap dengan ringkasan per pertanyaan."}
          </p>
        </Card>
      ) : (
        <>
        <nav className="flex gap-1 rounded-lg bg-paper-2 p-1 text-sm font-semibold" aria-label="Tampilan respons">
          {[
            { v: "summary", label: "Ringkasan" },
            { v: "people", label: "Per orang" },
          ].map((t) => (
            <Link
              key={t.v}
              href={tabHref(t.v)}
              aria-current={view === t.v ? "page" : undefined}
              className={cn("flex-1 rounded-md px-3 py-2 text-center transition-colors", view === t.v ? "bg-card text-ink shadow-soft" : "text-muted hover:text-ink")}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {view === "summary" ? (
          <ResponseSummary summaries={summarize(fields, answers)} total={totalResponses} />
        ) : (
          <PeopleTable id={id} q={q} page={page} custom={custom} />
        )}
        </>
      )}
    </main>
  );
}

async function PeopleTable({ id, q, page, custom }: { id: string; q: string; page: number; custom: { key: string; label: string }[] }) {
  const { rows, total } = await listParticipants(id, q, page);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `?${new URLSearchParams({ view: "people", ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative w-full sm:max-w-sm" role="search">
          <input type="hidden" name="view" value="people" />
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="q" className="sr-only">
            Cari respons
          </label>
          <Input id="q" name="q" defaultValue={q} placeholder="Cari nama, email, atau nomor" className="pl-9" />
        </form>
        {(q || total > 0) && (
          <ButtonLink href={`/api/forms/${id}/responses-csv`} variant="outline" prefetch={false}>
            <FileDown /> Ekspor CSV
          </ButtonLink>
        )}
      </div>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {q ? `${formatNumber(total)} hasil untuk "${q}"` : `${formatNumber(total)} respons`}
      </p>

      <Card className="mt-3 overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center bg-paper px-6 py-14 text-center">
            <Users className="size-6 text-muted" aria-hidden />
            <p className="mt-3 font-semibold text-ink">{q ? "Tidak ada respons yang cocok" : "Belum ada respons"}</p>
            <p className="mt-1 max-w-sm text-sm text-ink-2">
              {q
                ? "Coba kata kunci lain, atau cari dengan nomor sertifikat."
                : "Bagikan formulir lewat tombol Bagikan. Setiap yang mengisi akan muncul di sini."}
            </p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            {/* relative: contains the sr-only header text, which otherwise escapes the scroller and widens the page on mobile */}
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-2/70 text-left text-xs text-muted">
                  <th className="px-4 py-3 font-semibold">Responden</th>
                  {custom.map((f) => (
                    <th key={f.key} className="max-w-48 px-4 py-3 font-semibold">
                      <span className="line-clamp-2">{f.label}</span>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold">Nomor sertifikat</th>
                  <th className="px-4 py-3 font-semibold">Sertifikat</th>
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
                    {custom.map((f) => (
                      <td key={f.key} className="max-w-48 px-4 py-3 text-ink-2">
                        <span className="line-clamp-2">{answerText(sub.answers[f.key]) || <span className="text-faint">–</span>}</span>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <Link href={`/v/${encodeURIComponent(cert.number)}`} target="_blank" className="num text-xs whitespace-nowrap text-ink-2 hover:text-seal-ink hover:underline">
                        {cert.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {cert.status === "revoked" ? (
                        <Badge tone="danger">Dicabut</Badge>
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
    </div>
  );
}
