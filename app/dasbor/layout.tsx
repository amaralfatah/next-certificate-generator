import { LogOut } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/seal";
import { requireOrganizer } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const organizer = await requireOrganizer();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dasbor" aria-label="Dasbor">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-56 truncate text-sm text-muted sm:block" title={organizer.email}>
              {organizer.email}
            </span>
            <form action="/api/auth/keluar" method="post">
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-2 hover:bg-paper-2 hover:text-ink"
              >
                <LogOut className="size-4" aria-hidden /> Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
