import { NextResponse, type NextRequest } from "next/server";
import { neonAuth } from "@/lib/auth/neon";
import { endSession } from "@/lib/auth/session";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  await endSession();
  if (env.neonAuth) await neonAuth.signOut().catch(() => {});
  return NextResponse.redirect(new URL("/", req.url), 303);
}
