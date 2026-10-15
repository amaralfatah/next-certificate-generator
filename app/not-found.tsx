import Link from "next/link";
import { Seal } from "@/components/seal";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="laid grid min-h-dvh place-items-center px-4 text-center">
      <div className="rise">
        <Seal className="mx-auto size-16 -rotate-12 opacity-80" label="?" />
        <h1 className="mt-6 text-4xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-ink-2">Link mungkin salah ketik, atau form sudah dihapus penyelenggara.</p>
        <div className="mt-6 flex justify-center gap-2">
          <ButtonLink href="/">Beranda</ButtonLink>
          <ButtonLink href="/v" variant="outline">
            Cek sertifikat
          </ButtonLink>
        </div>
        <Link href="/" className="sr-only">
          Piagam
        </Link>
      </div>
    </main>
  );
}
