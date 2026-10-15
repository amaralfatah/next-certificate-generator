import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/seal";
import { Button, Input } from "@/components/ui";

export const metadata: Metadata = {
  title: "Cek keaslian sertifikat",
  description: "Masukkan nomor sertifikat untuk memastikan sertifikat diterbitkan lewat Piagam dan masih berlaku.",
};

export default async function VerifyLookupPage({ searchParams }: PageProps<"/v">) {
  const { nomor } = await searchParams;
  if (typeof nomor === "string" && nomor.trim()) redirect(`/v/${encodeURIComponent(nomor.trim().toUpperCase())}`);

  return (
    <main className="laid grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-md rise">
        <Link href="/" className="mx-auto mb-8 flex w-fit" aria-label="Beranda">
          <Wordmark />
        </Link>
        <div className="frame bg-card px-6 py-8">
          <h1 className="text-3xl font-semibold">Cek keaslian sertifikat</h1>
          <p className="mt-2 text-sm text-ink-2">
            Pindai QR pada sertifikat, atau ketik nomornya di bawah (tercetak di sertifikat, mis. <span className="num">WBN-2026-00042</span>).
          </p>
          <form className="mt-6 grid gap-3" action="/v">
            <label htmlFor="nomor" className="sr-only">
              Nomor sertifikat
            </label>
            <Input id="nomor" name="nomor" required placeholder="Nomor sertifikat" className="num uppercase" autoCapitalize="characters" spellCheck={false} />
            <Button type="submit" size="lg">
              <Search /> Cek
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
