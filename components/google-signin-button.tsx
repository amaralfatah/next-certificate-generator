"use client";

import { createAuthClient } from "@neondatabase/auth/next";
import { useState } from "react";

const authClient = createAuthClient();

export function GoogleSignInButton({ children }: { children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/api/auth/neon" });
        if (error) {
          setBusy(false);
          window.location.assign("/login?error=google");
        }
      }}
      className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-line-strong bg-card text-sm font-semibold text-ink transition-colors hover:bg-paper-2 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
