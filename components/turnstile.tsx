"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** Cloudflare Turnstile widget. Renders nothing when no site key is configured (local dev). */
export function Turnstile({ onToken, resetKey }: { onToken: (t: string | null) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!window.turnstile);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ready || !ref.current || !window.turnstile) return;
    idRef.current = window.turnstile.render(ref.current, {
      sitekey: TURNSTILE_SITE_KEY,
      language: "id",
      appearance: "interaction-only",
      callback: (t: string) => onToken(t),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
    return () => {
      if (idRef.current) window.turnstile?.remove(idRef.current);
    };
  }, [ready, onToken]);

  useEffect(() => {
    if (resetKey && idRef.current) {
      window.turnstile?.reset(idRef.current);
      onToken(null);
    }
  }, [resetKey, onToken]);

  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} />
      <div ref={ref} />
    </>
  );
}
