import "server-only";
import { Google } from "arctic";
import { env } from "@/lib/env";

export function googleClient() {
  if (!env.google) return null;
  return new Google(env.google.clientId, env.google.clientSecret, `${env.appUrl}/api/auth/google/callback`);
}

export type GoogleClaims = { email?: string; email_verified?: boolean; name?: string };
