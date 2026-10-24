import { ArrowRight, BadgeCheck, Download, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CertificateSvg } from "@/components/certificate-svg";
import { CertFontFaces } from "@/components/editor/cert-font-faces";
import { HeroDemo } from "@/components/hero-demo";
import { Seal, Wordmark } from "@/components/seal";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge, ButtonLink } from "@/components/ui";
import { currentOrganizer } from "@/lib/auth/session";
import { PRESETS } from "@/lib/pdf/presets";

export default async function Home() {
  const organizer = await currentOrganizer();
  // Signed out, CTAs go through /start so the first thing after Google sign-in is a new form, not an empty list.
  const cta = organizer ? { href: "/forms", label: "Buka formulir" } : { href: "/start", label: "Mulai buat sertifikat" };

  return (
    <div className="min-h-dvh overflow-x-clip">
      <CertFontFaces />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Sararia Certificates, beranda">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <ButtonLink href={organizer ? "/forms" : "/start?login"} prefetch={false} size="sm" variant="seal">
            {organizer ? "Formulir" : "Masuk"}
          </ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-6 pb-20 sm:gap-14 sm:px-6 sm:pt-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:pt-16">
          <div className="rise">
            <h1 className="text-[2.6rem] leading-[1.04] font-bold sm:text-6xl lg:text-[4rem]">
              Peserta isi form, sertifikat langsung jadi.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:mt-6 sm:text-lg">
              Satu link untuk semua peserta. Tanpa mengetik nama satu per satu, tanpa mengirim email satu per satu.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-8">
              <ButtonLink href={cta.href} prefetch={false} size="lg" variant="seal">
                {cta.label} <ArrowRight />
              </ButtonLink>
              <a
                href="#cara-kerja"
                className="-my-2 py-2 text-sm font-semibold text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink"
              >
                Lihat cara kerjanya
              </a>
            </div>
            {!organizer && <p className="mt-4 text-sm text-muted">Gratis. Masuk dengan Google.</p>}
          </div>

          <div className="rise [animation-delay:120ms]">
            <HeroDemo ctaLabel={organizer ? "Buat formulir dengan desain ini" : "Buat sertifikat seperti ini, gratis"} />
          </div>
        </section>

        <section id="cara-kerja" className="scroll-mt-6 border-y border-line bg-card/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="max-w-2xl text-4xl font-bold sm:text-[2.6rem]">Siap dibagikan dalam beberapa menit</h2>

            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              <li>
                <StepVisual>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-[2px] ring-1 ring-line">
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
                  <p className="mt-3 text-center text-xs text-muted">atau unggah desainmu sendiri (PNG/JPG)</p>
                </StepVisual>
                <h3 className="mt-5 text-xl font-semibold">1. Pilih desain</h3>
                <p className="mt-1.5 leading-relaxed text-ink-2">
                  Pakai template atau unggah desain sendiri.
                </p>
              </li>

              <li>
                <StepVisual>
                  <div className="flex items-center gap-4">
                    <QrMark className="size-20 shrink-0 rounded-md bg-white p-1.5 ring-1 ring-line" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">Pelatihan Guru</p>
                      <p className="num mt-1 text-[0.7rem] text-muted">
                        certificates.sararia.com
                        <span className="block">/f/pelatihan-guru</span>
                      </p>
                    </div>
                  </div>
                </StepVisual>
                <h3 className="mt-5 text-xl font-semibold">2. Bagikan link atau QR</h3>
                <p className="mt-1.5 leading-relaxed text-ink-2">
                  Tampilkan QR di layar atau kirim link ke grup.
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
                      <li key={no} className="flex items-center justify-between gap-2 rounded-md bg-card px-2.5 py-1.5 ring-1 ring-line">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{n}</span>
                          <span className="num text-[0.65rem] text-muted">{no}</span>
                        </span>
                        <Badge tone={st === "Valid" ? "ok" : "danger"}>{st}</Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-center text-xs text-muted">contoh data, bukan peserta sungguhan</p>
                </StepVisual>
                <h3 className="mt-5 text-xl font-semibold">3. Pantau peserta</h3>
                <p className="mt-1.5 leading-relaxed text-ink-2">
                  Cari, ekspor ke CSV, atau cabut sertifikat.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-4xl font-bold sm:text-[2.6rem]">Peserta mengambil sendiri, kamu tidak perlu mengirim</h2>
              <p className="mt-4 text-lg leading-relaxed text-ink-2">
                Pindai QR, isi nama dan email, unduh PDF. Salinannya juga dikirim ke email.
              </p>
            </div>
            <PhoneShowcase />
          </div>
        </section>

        <section className="bg-night text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-4xl font-bold sm:text-[2.6rem]">Hanya peserta yang hadir yang dapat sertifikat</h2>
            </div>
            <ul className="grid gap-4">
              {GUARDS.map(([title, body]) => (
                <li key={title} className="border-b border-white/10 pb-4 last:border-0">
                  <span className="block text-lg font-semibold text-white">{title}</span>
                  <span className="mt-1 block text-white/75">{body}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="tanya-jawab" className="mx-auto max-w-3xl scroll-mt-6 px-4 py-20 sm:px-6">
          <h2 className="text-4xl font-bold">Tanya jawab</h2>
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
              <h2 className="text-3xl font-bold">Sertifikat acara berikutnya, beres sendiri</h2>
            </div>
            <ButtonLink href={cta.href} prefetch={false} size="lg" variant="seal">
              {cta.label}
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            © {new Date().getFullYear()} Sararia Certificates, bagian dari{" "}
            <a href="https://sararia.com" className="-my-2 py-2 font-medium text-ink-2 hover:text-ink pointer-coarse:-my-3 pointer-coarse:py-3">
              Sararia
            </a>
            .
          </span>
          <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-5">
            {[
              ["/v", "Verifikasi sertifikat"],
              ["/terms", "Syarat layanan"],
              ["/privacy", "Kebijakan privasi"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="-my-2 py-2 hover:text-ink pointer-coarse:-my-3 pointer-coarse:py-3">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

const GUARDS = [
  ["Kode kehadiran", "Umumkan kodenya saat acara. Hanya yang hadir yang bisa memasukkannya."],
  ["Jadwal tutup dan kuota", "Formulir menutup sendiri pada waktunya atau saat kuota penuh."],
  ["Satu sertifikat per email", "Pemeriksaan anti-bot menahan pengisian otomatis."],
] as const;

const FAQ = [
  {
    q: "Berapa biayanya?",
    a: "Gratis. Email dibatasi sekitar 100 per hari, tetapi PDF selalu bisa diunduh langsung.",
  },
  {
    q: "Apakah peserta harus membuat akun?",
    a: "Tidak. Hanya penyelenggara yang masuk dengan Google.",
  },
  {
    q: "Bisakah memakai desain sertifikat sendiri?",
    a: "Bisa. Unggah PNG/JPG ukuran 16:9 atau A4, lalu atur posisi nama, tanggal, nomor, dan QR.",
  },
  {
    q: "Bagaimana kalau peserta salah mengetik nama?",
    a: "Peserta melihat pratinjau sebelum mengirim. Kalau tetap salah, hapus entrinya dan peserta mengisi ulang.",
  },
  {
    q: "Bagaimana mencegah orang yang tidak hadir mengambil sertifikat?",
    a: "Nyalakan kode kehadiran dan umumkan saat acara. Atur juga jadwal tutup dan kuota.",
  },
  {
    q: "Siapa yang bisa melihat data peserta?",
    a: "Hanya penyelenggara. Halaman verifikasi publik hanya menampilkan nama, acara, tanggal, penyelenggara, dan nomor sertifikat.",
  },
];

function StepVisual({ children }: { children: React.ReactNode }) {
  return <div className="flex h-48 flex-col justify-center overflow-hidden rounded-xl border border-line bg-paper-2 p-4">{children}</div>;
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
    <div className="relative mx-auto flex w-full max-w-[560px] flex-col items-center gap-6 sm:flex-row sm:items-end sm:justify-center" aria-hidden>
      <div className="aspect-[9/19] w-[240px] shrink-0 rounded-[2.4rem] bg-[#111] p-[7px] shadow-lift">
        <div className="flex h-full flex-col overflow-hidden rounded-[2rem] bg-paper">
          <div className="relative flex h-7 shrink-0 items-center justify-between px-5 pt-1 text-[0.5rem] font-semibold text-ink">
            <span className="num">09.41</span>
            <div className="absolute top-1.5 left-1/2 h-[18px] w-[34%] -translate-x-1/2 rounded-full bg-[#111]" />
            <span className="flex items-end gap-[2px]" aria-hidden>
              <span className="h-1 w-[2px] rounded-[1px] bg-ink" />
              <span className="h-1.5 w-[2px] rounded-[1px] bg-ink" />
              <span className="h-2 w-[2px] rounded-[1px] bg-ink" />
              <span className="ml-1 h-2 w-3.5 rounded-[2px] border border-ink p-[1px]">
                <span className="block h-full w-3/4 rounded-[1px] bg-ink" />
              </span>
            </span>
          </div>
          <div className="flex flex-1 flex-col px-4 pt-5 pb-2">
            <div className="frame bg-card px-3 py-3">
              <p className="font-display text-[0.9rem] leading-tight font-bold">Jawabanmu sudah terkirim</p>
              <p className="mt-0.5 text-[0.625rem] leading-snug text-ink-2">Terima kasih sudah hadir di Webinar Literasi Digital.</p>
            </div>
            <div className="frame mt-2.5 bg-card px-3 py-4 text-center">
              <p className="font-display text-[0.8125rem] font-semibold">Sertifikatmu sudah siap</p>
              <Seal className="mx-auto mt-2.5 size-11" label="✓" />
              <div className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-full bg-seal text-[0.6875rem] font-medium text-white">
                <Download className="size-3" /> Unduh sertifikat (PDF)
              </div>
              <p className="mt-2 text-[0.625rem] leading-snug text-ink-2">Salinannya juga dikirim ke email. Periksa folder spam jika tidak ada.</p>
              <p className="num mt-2.5 text-[0.625rem] text-muted">No. LDG-2026-00042</p>
              <p className="mt-0.5 flex items-center justify-center gap-1 text-[0.625rem] font-semibold text-ink-2">
                <ShieldCheck className="size-3" /> Lihat halaman verifikasi
              </p>
            </div>
            <p className="mt-auto text-center text-[0.625rem] text-faint">Sararia Certificates</p>
          </div>
          <div className="mx-auto mb-2 h-1 w-[36%] shrink-0 rounded-full bg-ink/80" />
        </div>
      </div>
      <div className="w-[220px] shrink-0 rounded-xl border border-line bg-card p-4 shadow-soft sm:mb-8">
        <div className="flex items-center gap-1.5 rounded-md bg-ok-wash px-2 py-1.5 text-[0.6875rem] font-semibold text-ok">
          <BadgeCheck className="size-3.5" /> Sertifikat asli dan berlaku
        </div>
        <p className="mt-4 text-center text-[0.6875rem] text-muted">Diberikan kepada</p>
        <p className="mt-1 text-center font-display text-lg leading-tight font-bold tracking-[-0.02em]">Siti Rahmawati</p>
        <div className="mx-auto mt-2 h-px w-1/2 bg-line-strong" />
        <dl className="mt-3 grid gap-1.5 text-[0.6875rem]">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Acara</dt>
            <dd className="text-right font-medium">Webinar Literasi Digital</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Tanggal</dt>
            <dd className="font-medium">9 Okt 2026</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Penyelenggara</dt>
            <dd className="text-right font-medium">Komunitas Guru Penggerak</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Nomor</dt>
            <dd className="num font-medium whitespace-nowrap">LDG-2026-00042</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Diterbitkan</dt>
            <dd className="font-medium">9 Okt 2026</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
