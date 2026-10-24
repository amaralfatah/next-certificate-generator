import { Card } from "@/components/ui";
import { formatNumber } from "@/lib/i18n";
import type { QuestionSummary } from "@/lib/responses";

/** One block per question: bars for choices and scales, the latest answers for free text. */
export function ResponseSummary({ summaries, total }: { summaries: QuestionSummary[]; total: number }) {
  if (!summaries.length) {
    return (
      <Card className="px-6 py-10 text-center text-sm text-ink-2">
        Formulir ini hanya berisi nama dan email. Daftar lengkapnya ada di <b className="font-medium text-ink">Per orang</b>.
      </Card>
    );
  }
  return (
    <div className="grid gap-3">
      {summaries.map((s) => (
        <Card key={s.field.key} className="p-5 sm:p-6">
          <h3 className="font-semibold">{s.field.label}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {formatNumber(s.answered)} dari {formatNumber(total)} menjawab
          </p>
          {s.answered === 0 ? (
            <p className="mt-4 text-sm text-faint">Belum ada jawaban.</p>
          ) : s.kind === "counts" ? (
            <ul className="mt-4 grid gap-2.5">
              {s.buckets.map((b) => {
                const pct = s.answered ? Math.round((b.count / s.answered) * 100) : 0;
                return (
                  <li key={b.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
                    <span className="truncate text-ink-2" title={b.label}>
                      {b.label}
                    </span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-paper-2" aria-hidden>
                      <span className="block h-full rounded-full bg-seal" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="num w-20 text-right text-ink-2">
                      {formatNumber(b.count)} <span className="text-muted">({pct}%)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="mt-4 grid gap-1.5">
              {s.latest.map((t, i) => (
                <li key={i} className="rounded-md bg-paper-2/70 px-3 py-2 text-sm whitespace-pre-line text-ink-2">
                  {t}
                </li>
              ))}
              {s.answered > s.latest.length && (
                <li className="pt-1 text-xs text-muted">
                  {formatNumber(s.answered - s.latest.length)} jawaban lain ada di Per orang dan di ekspor CSV.
                </li>
              )}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
