import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

/** Neon Auth (Managed Better Auth). Only call when `env.neonAuth` is true. */
export const neonAuth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? "",
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET ?? "" },
});
