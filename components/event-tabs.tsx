"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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
  const navRef = useRef<HTMLElement>(null);
  // On narrow screens the strip scrolls; keep the current tab in view so the user can see where they are.
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const { left, right } = active.getBoundingClientRect();
    const box = nav.getBoundingClientRect();
    if (left < box.left || right > box.right) nav.scrollLeft += right - box.right + 16;
  }, [pathname]);
  return (
    <nav ref={navRef} className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Bagian acara">
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
