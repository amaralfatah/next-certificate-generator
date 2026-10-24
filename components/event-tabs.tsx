"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function EventTabs({ base, responses }: { base: string; responses: number }) {
  const TABS = [
    { href: "", label: "Pertanyaan" },
    { href: "/responses", label: "Respons", count: responses },
    { href: "/certificate", label: "Sertifikat" },
    { href: "/settings", label: "Setelan" },
  ];
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
    // The right edge fades out on narrow screens so a clipped tab reads as "scroll for more".
    <nav
      ref={navRef}
      className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]"
      aria-label="Bagian formulir"
    >
      {TABS.map((t) => {
        const href = base + t.href;
        const active = pathname === href;
        return (
          <Link
            key={t.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative shrink-0 px-3 py-3 text-sm font-semibold transition-[color,opacity] active:opacity-60 active:duration-75",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.count ? <span className="num ml-1.5 rounded-full bg-paper-2 px-1.5 py-0.5 text-xs font-medium text-ink-2">{t.count}</span> : null}
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
