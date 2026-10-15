import { ArrowRight, BadgeCheck, Download, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CertificateSvg } from "@/components/certificate-svg";
import { CertFontFaces } from "@/components/editor/cert-font-faces";
import { HeroDemo } from "@/components/hero-demo";
import { Seal, Wordmark } from "@/components/seal";
import { Badge, ButtonLink } from "@/components/ui";
import { currentOrganizer } from "@/lib/auth/session";
import { PRESETS } from "@/lib/pdf/presets";

export default async function Home() {
  const organizer = await currentOrganizer();
  const cta = organizer ? { href: "/dasbor", label: "Buka dasbor" } : { href: "/masuk", label: "Mulai buat sertifikat" };

  return (
    <div className="laid min-h-dvh overflow-x-clip">
      <CertFontFaces />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Piagam, beranda">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#cara-kerja" className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink-2 hover:bg-paper-2 md:block">
            Cara kerja
          </a>
          <a href="#tanya-jawab" className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink-2 hover:bg-paper-2 md:block">
            Tanya jawab
          </a>
          <Link href="/v" className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink-2 hover:bg-paper-2 sm:block">
            Cek sertifikat
          </Link>
          <ButtonLink href={cta.href} size="sm">
            {organizer ? "Dasbor" : "Masuk"}
          </ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:pt-16">
          <div className="rise">
            <h1 className="text-[2.6rem] leading-[1.04] font-semibold sm:text-6xl lg:text-[4rem]">
              Peserta isi form, sertifikat langsung jadi.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              Tidak perlu lagi mengetik nama peserta satu per satu di Canva. Pilih desain, bagikan link ke peserta, dan
              masing-masing mengunduh sertifikat PDF bernomor yang keasliannya bisa dicek lewat QR.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href={cta.href} size="lg" variant="seal">
                {cta.label} <ArrowRight />
              </ButtonLink>
              <ButtonLink href="#cara-kerja" size="lg" variant="outline">
                Lihat cara kerjanya
              </ButtonLink>
            </div>
            <p className="mt-5 text-sm text-muted">Gratis. Peserta tidak perlu membuat akun.</p>
          </div>

          <div className="rise [animation-delay:120ms]">
            <HeroDemo />
          </div>
        </section>

        <section id="cara-kerja" className="scroll-mt-6 border-y border-line bg-card/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="max-w-2xl text-4xl font-semibold sm:text-[2.6rem]">Diatur sekali sebelum acara</h2>
            <p className="mt-3 max-w-xl text-lg text-ink-2">
              Biasanya selesai dalam beberapa menit. Setelah link dibagikan, penyelenggara tinggal memantau.
            </p>

            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              <li>
                <StepVisual>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-[2px] shadow-[0_4px_10px_-4px_oklch(0.27_0.04_255/0.35)]">
                        <CertificateSvg
                          width={p.widthPt}
                          height={p.heightPt}
                          shapes={p.shapes}
                          fields={p.fields}
                          values={{ nama: "Dewi Lestari", acara: "Pelatihan Guru", tanggal: "9 Oktober 2026" }}
                          className="block aspect-video w-full"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-xs text-muted">atau unggah PNG/JPG dari Canva</p>
                </StepVisual>
                <h3 className="mt-5 text-xl font-semibold">1. Pilih desain</h3>
                <p className="mt-1.5 leading-relaxed text-ink-2">
                  Pakai salah satu template, atau unggah desainmu sendiri. Kolom nama, tanggal, nomor, dan QR sudah tertata dan
                  bisa digeser.
                </p>
              </li>

              <li>
                <StepVisual>
                  <div className="flex items-center gap-4">
                    <QrMark className="size-20 shrink-0 rounded-md bg-white p-1.5 ring-1 ring-line" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">Pelatihan Guru</p>
                      <p className="num mt-1 truncate text-[0.7rem] text-muted">piagam.caanglabs.com/f/pelatihan-guru</p>
                      <Badge tone="ok" className="mt-2">
                        <span className="size-1.5 rounded-full bg-current" aria-hidden />
                        Dibuka
                      </Badge>
                    </div>
                  </div>
                </StepVisual>
                <h3 className="mt-5 text-xl font-semibold">2. Bagikan link atau QR</h3>
                <p className="mt-1.5 leading-relaxed text-ink-2">
                  Tampilkan QR di layar saat acara atau kirim link ke grup WhatsApp. Kode kehadiran, jadwal tutup, dan kuota bisa
                  diatur bila perlu.
                </p>
              </li>

              <li>
                <StepVisual>
                  <ul className="grid gap-1.5 text-xs">
                    {[
                      ["Dewi Lestari", "PG-2026-00001", "Valid"],
                      ["Rizky Pratama", "PG-2026-00002", "Valid"],
                      ["Andi Saputra", "PG-2026-00003", "Dicabut"],
                    ].map(([n, no, st]) => (
                      <li key={no} className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 ring-1 ring-line">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{n}</span>
                          <span className="num text-[0.65rem] text-muted">{no}</span>
                        </span>
                        <Badge tone={st === "Valid" ? "ok" : "seal"}>{st}</Badge>
                      </li>
                    ))}
                  </ul>
                </StepVisual>
                <h3 className="mt-5 text-xl font-semibold">3. Pantau peserta</h3>
                <p className="mt-1.5 leading-relaxed text-ink-2">
                  Setiap peserta mendapat nomor sendiri. Daftarnya bisa dicari, diekspor ke CSV, dan sertifikat yang keliru bisa
                  dicabut.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-4xl font-semibold sm:text-[2.6rem]">Peserta mengambil sertifikat dari ponselnya</h2>
              <p className="mt-4 text-lg leading-relaxed text-ink-2">
                Mereka memindai QR, mengisi nama dan email, lalu melihat sertifikatnya dengan nama mereka sebelum mengirim. Kalau
                ejaannya salah, masih bisa diperbaiki di langkah itu.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-ink-2">
                PDF langsung bisa diunduh, dan salinannya dikirim ke email. Siapa pun yang memindai QR di sertifikat akan melihat
                halaman verifikasi berisi nama, acara, dan tanggal.
              </p>
            </div>
            <PhoneShowcase />
          </div>
        </section>

        <section className="border-y border-line bg-ink text-paper">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-4xl font-semibold sm:text-[2.6rem]">Yang tidak hadir tidak bisa ikut mengambil</h2>
              <p className="mt-4 max-w-md text-paper/70">
                Link form mudah tersebar ke luar ruangan. Pengaman ini bisa dinyalakan per acara.
              </p>
            </div>
            <ul className="grid gap-4">
              {GUARDS.map((g) => (
                <li key={g} className="flex gap-3 border-b border-paper/10 pb-4 last:border-0">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[oklch(0.78_0.12_155)]" aria-hidden />
                  <span className="text-paper/85">{g}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="tanya-jawab" className="mx-auto max-w-3xl scroll-mt-6 px-4 py-20 sm:px-6">
          <h2 className="text-4xl font-semibold">Tanya jawab</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-ink-2 transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-line bg-card/60">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">Punya acara dalam waktu dekat?</h2>
              <p className="mt-2 text-ink-2">Masuk dengan Google dan siapkan form sertifikatnya sekarang.</p>
            </div>
            <ButtonLink href={cta.href} size="lg" variant="seal">
              {cta.label} <ArrowRight />
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Piagam, bagian dari Caang Labs.</span>
          <Link href="/v" className="hover:text-ink">
            Verifikasi sertifikat
          </Link>
        </div>
      </footer>
    </div>
  );
}

const GUARDS = [
  "Kode kehadiran yang baru diumumkan saat acara berlangsung.",
  "Jadwal buka dan tutup form, serta batas jumlah peserta.",
  "Satu sertifikat untuk satu email, dan pemeriksaan anti-bot.",
  "Sertifikat yang dicabut langsung berstatus \"Dicabut\" di halaman verifikasi.",
];

const FAQ = [
  {
    q: "Berapa biayanya?",
    a: "Gratis untuk acara kecil sampai menengah. Sertifikat selalu bisa diunduh langsung. Email dikirim selama kuota harian (sekitar 100 email) belum habis.",
  },
  {
    q: "Apakah peserta harus membuat akun?",
    a: "Tidak. Peserta membuka link atau memindai QR, mengisi nama dan email, lalu mengunduh sertifikat. Hanya penyelenggara yang masuk dengan akun Google.",
  },
  {
    q: "Bisakah memakai desain sertifikat sendiri?",
    a: "Bisa. Ekspor desain dari Canva atau PowerPoint sebagai PNG/JPG (ukuran slide 16:9 atau A4), unggah, lalu geser kolom nama, tanggal, nomor, dan QR ke posisinya. Tampilan di editor sama dengan hasil PDF.",
  },
  {
    q: "Bagaimana kalau peserta salah mengetik nama?",
    a: "Sebelum mengirim, peserta melihat sertifikatnya dengan nama yang mereka ketik. Kalau tetap salah, penyelenggara menghapus entri itu dari daftar peserta, lalu peserta mengisi ulang dengan email yang sama.",
  },
  {
    q: "Bagaimana mencegah orang yang tidak hadir mengambil sertifikat?",
    a: "Nyalakan kode kehadiran dan umumkan saat acara. Atur juga jadwal tutup form dan kuota. Kode yang salah lima kali dalam 10 menit membuat percobaan dari perangkat itu diblokir sementara.",
  },
  {
    q: "Siapa yang bisa melihat data peserta?",
    a: "Hanya penyelenggara acara itu. Halaman verifikasi publik hanya menampilkan nama, acara, tanggal, penyelenggara, dan nomor sertifikat. Penyelenggara bisa menghapus acara beserta seluruh datanya kapan saja.",
  },
];

function StepVisual({ children }: { children: React.ReactNode }) {
  return <div className="laid flex h-48 flex-col justify-center overflow-hidden rounded-xl border border-line bg-paper-2 p-4">{children}</div>;
}

/** Decorative QR-like mark for the marketing page (not a scannable code). */
function QrMark({ className }: { className?: string }) {
  const cells = [
    "1111111010111111",
    "1000001001100001",
    "1011101011101101",
    "1011101000101101",
    "1000001010100001",
    "1111111010111111",
    "0000000011000000",
    "1101011100110101",
    "0110100101011010",
    "0000000010110011",
    "1111111001011010",
    "1000001010001101",
    "1011101001110010",
    "1000001011011101",
    "1111111010100110",
  ];
  return (
    <svg viewBox="0 0 16 15" className={className} aria-hidden shapeRendering="crispEdges">
      {cells.flatMap((row, y) => [...row].map((c, x) => (c === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#1c2a3a" /> : null)))}
    </svg>
  );
}

/** Static replica of the participant flow on a phone, next to its verification page. */
function PhoneShowcase() {
  return (
    <div className="relative mx-auto flex w-full max-w-[520px] items-end justify-center gap-4 sm:gap-6" aria-hidden>
      <div className="w-[56%] max-w-[260px] rounded-[2.2rem] bg-ink p-2 shadow-[0_30px_60px_-24px_oklch(0.27_0.04_255/0.55)]">
        <div className="overflow-hidden rounded-[1.8rem] bg-paper">
          <div className="mx-auto mt-2 h-5 w-20 rounded-full bg-ink" />
          <div className="px-4 pt-4 pb-6">
            <p className="text-[0.55rem] font-semibold text-seal-ink">Komunitas Guru Penggerak</p>
            <p className="mt-1 font-display text-[1.05rem] leading-tight font-semibold">Webinar Literasi Digital</p>
            <div className="frame mt-4 bg-card px-3 py-5 text-center">
              <Seal className="mx-auto size-12" label="✓" />
              <p className="mt-3 font-display text-base font-semibold">Sertifikat siap!</p>
              <p className="num mt-1 text-[0.55rem] text-muted">No. LDG-2026-00042</p>
              <div className="mt-4 flex h-8 items-center justify-center gap-1.5 rounded-md bg-seal text-[0.65rem] font-semibold text-white">
                <Download className="size-3" /> Unduh sertifikat (PDF)
              </div>
              <p className="mt-2.5 text-[0.55rem] leading-snug text-ink-2">Salinannya juga dikirim ke email.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-8 w-[44%] max-w-[210px] rotate-2 rounded-xl border border-line bg-card p-4 shadow-[0_20px_40px_-20px_oklch(0.27_0.04_255/0.45)]">
        <div className="flex items-center gap-1.5 rounded-md bg-ok-wash px-2 py-1.5 text-[0.6rem] font-semibold text-ok">
          <BadgeCheck className="size-3.5" /> Asli dan berlaku
        </div>
        <p className="mt-4 text-center text-[0.55rem] text-muted">Diberikan kepada</p>
        <p className="mt-1 text-center font-display text-lg leading-tight font-semibold">Siti Rahmawati</p>
        <div className="mx-auto mt-2 h-px w-1/2 bg-gold" />
        <dl className="mt-3 grid gap-1.5 text-[0.55rem]">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Tanggal</dt>
            <dd className="font-medium">9 Okt 2026</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Nomor</dt>
            <dd className="num font-medium">LDG-2026-00042</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
