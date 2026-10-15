import { decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { googleClient, type GoogleClaims } from "@/lib/auth/google";
import { startSession, upsertOrganizer } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const back = (error: string) => NextResponse.redirect(new URL(`/masuk?error=${error}`, req.url));
  const google = googleClient();
  if (!google) return back("config");

  const jar = await cookies();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = jar.get("g_state")?.value;
  const verifier = jar.get("g_verifier")?.value;
  jar.delete("g_state");
  jar.delete("g_verifier");
  if (!code || !state || !verifier || state !== savedState) return back("state");

  let claims: GoogleClaims;
  try {
    const tokens = await google.validateAuthorizationCode(code, verifier);
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch {
    return back("google");
  }
  if (!claims.email || claims.email_verified === false) return back("email");

  const organizer = await upsertOrganizer(claims.email, claims.name ?? "");
  await startSession(organizer.id);
  return NextResponse.redirect(new URL("/dasbor", req.url));
}
