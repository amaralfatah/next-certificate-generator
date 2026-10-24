import { LogOut } from "lucide-react";

/** The signed-in organizer as a small avatar; the menu holds the email and Keluar. Works without JavaScript. */
export function AccountMenu({ name, email }: { name: string; email: string }) {
  return (
    <details className="group relative">
      <summary
        className="grid size-9 cursor-pointer list-none place-items-center rounded-full bg-ink text-sm font-semibold text-paper select-none hover:opacity-90 pointer-coarse:size-11 [&::-webkit-details-marker]:hidden"
        aria-label={`Akun: ${email}`}
        title={email}
      >
        {(name.trim()[0] ?? email[0]).toUpperCase()}
      </summary>
      <div className="absolute top-full right-0 z-40 mt-2 w-64 rounded-xl border border-line bg-card p-1.5 shadow-lift">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-2 hover:bg-paper-2 hover:text-ink">
            <LogOut className="size-4" aria-hidden /> Keluar
          </button>
        </form>
      </div>
    </details>
  );
}
