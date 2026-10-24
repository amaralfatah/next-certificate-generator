import { NextResponse, type NextRequest } from "next/server";
import { neonAuth } from "@/lib/auth/neon";
import { env } from "@/lib/env";

/** Neon Auth returns here with a one-time verifier; the middleware exchanges it for session cookies. */
const neonCallback = neonAuth.middleware({ loginUrl: "/login?error=google" });

/**
 * Optimistic check only: no session cookie means straight to the login page.
 * Every dashboard page and action still verifies the session and ownership itself.
 */
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/api/auth/neon" && env.neonAuth) return neonCallback(req);
  if (!req.cookies.has("piagam_session")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/forms/:path*", "/api/auth/neon"],
};
