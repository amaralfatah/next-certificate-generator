"use client";

import { Moon, Sun } from "lucide-react";

/** Flips light and dark. The saved choice is read by the inline script in app/layout.tsx; without one the system setting applies. */
export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
  }

  // Both icons are rendered and CSS picks one, so the server markup matches whichever theme the script chose.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Ganti tema terang/gelap"
      title="Ganti tema"
      className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-ink/5 hover:text-ink pointer-coarse:size-11"
    >
      <Sun className="size-4 dark:hidden" aria-hidden />
      <Moon className="hidden size-4 dark:block" aria-hidden />
    </button>
  );
}
