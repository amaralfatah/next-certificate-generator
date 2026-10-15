import "server-only";
import { env } from "@/lib/env";

/** Verifies a Cloudflare Turnstile token. Passes when Turnstile is not configured (local dev). */
export async function verifyTurnstile(token: string | null, ip: string | null) {
  if (!env.turnstileSecret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.turnstileSecret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
