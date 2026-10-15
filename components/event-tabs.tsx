"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Ringkasan" },
  { href: "/template", label: "Template" },
  { href: "/form", label: "Form" },
  { href: "/pengaturan", label: "Pengaturan" },
  { href: "/peserta", label: "Peserta" },
];

export function EventTabs({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Bagian acara">
      {TABS.map((t) => {
        const href = base + t.href;
        const active = pathname === href;
        return (
          <Link
            key={t.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative shrink-0 px-3 py-3 text-sm font-semibold transition-colors",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
            <span
              className={cn(
                "absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-seal transition-transform duration-200",
                active ? "scale-x-100" : "scale-x-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
