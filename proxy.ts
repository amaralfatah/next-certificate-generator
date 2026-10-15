import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: no session cookie means straight to the login page.
 * Every dashboard page and action still verifies the session and ownership itself.
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("piagam_session")) {
    return NextResponse.redirect(new URL("/masuk", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dasbor/:path*"],
};
