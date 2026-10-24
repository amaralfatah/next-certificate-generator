import Link from "next/link";
import { Wordmark } from "@/components/seal";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Sararia Certificates, beranda">
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">Terakhir diperbarui {updated}</p>
        <div className="mt-10 grid gap-8 leading-relaxed text-ink-2 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>
    </div>
  );
}
