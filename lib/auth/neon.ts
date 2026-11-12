import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

let instance: ReturnType<typeof createNeonAuth> | undefined;

/**
 * Neon Auth (Managed Better Auth). Only call when `env.neonAuth` is true.
 * Created on first use: `createNeonAuth` throws without a cookie secret, and building it at
 * import time took the proxy (and every dashboard page) down in the zero-config dev setup.
 */
export function neonAuth() {
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL ?? "",
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET ?? "" },
  });
  return instance;
}
