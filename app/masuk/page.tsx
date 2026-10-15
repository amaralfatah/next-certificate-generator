import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/seal";
import { Button, Input, Notice } from "@/components/ui";
import { currentOrganizer } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Masuk" };

const ERRORS: Record<string, string> = {
  state: "Sesi login kedaluwarsa. Silakan coba lagi.",
  google: "Login Google gagal. Silakan coba lagi.",
  email: "Akun Google ini belum memiliki email terverifikasi.",
  config: "Login Google belum dikonfigurasi di server.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentOrganizer()) redirect("/dasbor");
  const { error } = await searchParams;

  return (
    <main className="laid grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm rise">
        <Link href="/" className="mx-auto mb-8 flex w-fit" aria-label="Beranda">
          <Wordmark />
        </Link>
        <div className="frame bg-card px-6 py-8 sm:px-8">
          <h1 className="text-center text-3xl font-semibold">Masuk penyelenggara</h1>
          <p className="mt-2 text-center text-sm text-ink-2">Buat acara dan bagikan sertifikat. Peserta tidak perlu akun.</p>

          {error && ERRORS[error] && (
            <Notice tone="seal" className="mt-6">
              {ERRORS[error]}
            </Notice>
          )}

          {env.google ? (
            <a
              href="/api/auth/google"
              className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-line-strong bg-card text-sm font-semibold text-ink transition-colors hover:bg-paper-2"
            >
              <GoogleIcon /> Lanjutkan dengan Google
            </a>
          ) : env.devLogin ? (
            <form action="/api/auth/dev" method="post" className="mt-7 grid gap-3">
              <Notice tone="warn">Mode pengembangan: Google belum dikonfigurasi. Masuk dengan email apa saja.</Notice>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <Input id="email" name="email" type="email" required placeholder="kamu@contoh.id" autoComplete="email" />
              <Button type="submit" size="lg">
                Masuk (dev)
              </Button>
            </form>
          ) : (
            <Notice tone="seal" className="mt-6">
              {ERRORS.config}
            </Notice>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Dengan masuk, kamu bertindak sebagai pengendali data peserta acaramu. Piagam memproses data atas namamu.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}
