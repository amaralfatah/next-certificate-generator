import { ArrowRight, BadgeCheck, CircleX, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { Seal, Wordmark } from "@/components/seal";
import { ButtonLink } from "@/components/ui";
import { findCertificate } from "@/lib/certificates/lookup";
import { formatDate, formatEventDate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const load = cache((number: string) => findCertificate(decodeURIComponent(number)));

export async function generateMetadata({ params }: PageProps<"/v/[number]">): Promise<Metadata> {
  const cert = await load((await params).number);
  return {
    title: cert ? `Verifikasi ${cert.number}` : "Sertifikat tidak ditemukan",
    robots: { index: false, follow: false },
  };
}

export default async function VerifyPage({ params }: PageProps<"/v/[number]">) {
  const { number } = await params;
  const cert = await load(number);
  const shown = decodeURIComponent(number).toUpperCase();

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="mx-auto mb-8 flex w-fit" aria-label="Certificates, beranda">
          <Wordmark />
        </Link>

        {!cert ? (
          <div className="frame bg-card px-6 py-10 text-center rise">
            <SearchX className="mx-auto size-12 text-muted" strokeWidth={1.5} />
            <h1 className="mt-4 text-3xl font-bold">Tidak ditemukan</h1>
            <p className="mt-2 text-ink-2">
              Tidak ada sertifikat bernomor <span className="num font-semibold text-ink">{shown}</span> yang diterbitkan lewat Sararia Certificates.
              Periksa kembali nomornya; bila tetap tidak ditemukan, sertifikat ini kemungkinan tidak asli.
            </p>
            <ButtonLink href="/v" variant="outline" className="mt-6">
              Cek nomor lain
            </ButtonLink>
          </div>
        ) : (
          <article className="frame bg-card px-6 pt-8 pb-6 sm:px-9 sm:pb-8 rise">
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold",
                cert.status === "valid" ? "bg-ok-wash text-ok" : "bg-danger-wash text-danger",
              )}
            >
              {cert.status === "valid" ? <BadgeCheck className="size-5" /> : <CircleX className="size-5" />}
              {cert.status === "valid" ? "Sertifikat asli dan berlaku" : "Sertifikat ini telah dicabut oleh penyelenggara"}
            </div>

            <p className="mt-8 text-center text-[0.7rem] tracking-[0.3em] text-muted uppercase">Diberikan kepada</p>
            <h1
              className={cn("mt-2 text-center text-[2.1rem] leading-tight font-bold tracking-[-0.03em] break-words", cert.status === "revoked" && "text-muted line-through decoration-danger/60")}
            >
              {cert.name}
            </h1>
            <div className="mx-auto mt-4 h-px w-1/2 bg-line-strong" />

            <dl className="mt-7 grid gap-3 text-sm">
              <Row label="Acara" value={cert.eventTitle} />
              <Row label="Tanggal" value={formatEventDate(cert.eventDate, cert.eventEndDate)} />
              <Row label="Penyelenggara" value={cert.organizerLabel} />
              <Row label="Nomor" value={<span className="num">{cert.number}</span>} />
              <Row label="Diterbitkan" value={formatDate(cert.issuedAt)} />
            </dl>

            <div className="mt-4 flex justify-end">
              <Seal
                className={cn("stamp-in size-20 opacity-90 [animation-delay:300ms]", cert.status === "revoked" && "grayscale")}
                label={cert.status === "valid" ? "✓" : "×"}
              />
            </div>
          </article>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Halaman ini diterbitkan oleh Sararia Certificates. Email dan data form peserta tidak pernah ditampilkan.
        </p>
        {cert && (
          <p className="mt-3 text-center text-sm text-ink-2">
            Menyelenggarakan acara?{" "}
            <Link href="/" className="inline-flex items-center gap-1 py-1 font-semibold text-seal-ink hover:underline hover:underline-offset-4 pointer-coarse:py-2.5">
              Buat sertifikat seperti ini, gratis <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-line pb-3 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
