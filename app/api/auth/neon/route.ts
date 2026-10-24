import { NextResponse, type NextRequest } from "next/server";
import { neonAuth } from "@/lib/auth/neon";
import { startSession, upsertOrganizer } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { pathAfterSignIn } from "@/lib/new-form";

/** Landing route after Neon Auth sign-in: turns the Neon session into the app's organizer session. */
export async function GET(req: NextRequest) {
  const back = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  if (!env.neonAuth) return back("config");

  try {
    const { data: session } = await neonAuth.getSession();
    const user = session?.user;
    if (!user?.email) return back("google");
    if (user.emailVerified === false) return back("email");

    const organizer = await upsertOrganizer(user.email, user.name ?? "");
    await startSession(organizer.id);
    return NextResponse.redirect(new URL(await pathAfterSignIn(organizer), req.url));
  } catch (e) {
    console.error("neon sign-in callback failed", e);
    return back("server");
  }
}
