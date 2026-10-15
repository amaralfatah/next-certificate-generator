import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleClient } from "@/lib/auth/google";

export async function GET() {
  const google = googleClient();
  if (!google) return NextResponse.redirect(new URL("/masuk?error=config", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
  const jar = await cookies();
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set("g_state", state, opts);
  jar.set("g_verifier", verifier, opts);
  return NextResponse.redirect(url);
}
