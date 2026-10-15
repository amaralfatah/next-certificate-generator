import { NextResponse, type NextRequest } from "next/server";
import { startSession, upsertOrganizer } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { EMAIL_RE } from "@/lib/forms";

/** Development-only login by email. Disabled in production and whenever Google is configured. */
export async function POST(req: NextRequest) {
  if (!env.devLogin) return new NextResponse("Not found", { status: 404 });
  const email = String((await req.formData()).get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.redirect(new URL("/masuk", req.url), 303);
  const organizer = await upsertOrganizer(email, "");
  await startSession(organizer.id);
  return NextResponse.redirect(new URL("/dasbor", req.url), 303);
}
