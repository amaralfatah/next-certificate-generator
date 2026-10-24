import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { currentOrganizer } from "@/lib/auth/session";
import { clearStartIntent, createFormFor, rememberSampleName, saveStartIntent } from "@/lib/new-form";

/**
 * Landing CTAs end here. Signed out: remember the chosen design and sign in; the login callback creates the form.
 * Signed in, POST (the hero demo): a new form with that design straight away. GET never creates one,
 * since links get prefetched and crawled.
 */
async function start(req: NextRequest, presetId: string | null, create: boolean) {
  const organizer = await currentOrganizer();
  if (!organizer) {
    await saveStartIntent(presetId);
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }
  if (!create) return NextResponse.redirect(new URL("/forms", req.url), 303);
  const id = await createFormFor(organizer, presetId);
  revalidatePath("/forms");
  return NextResponse.redirect(new URL(`/forms/${id}`, req.url), 303);
}

export async function GET(req: NextRequest) {
  // Plain "Masuk" from the header: forget any design picked earlier, so signing in lands on the form list.
  if (req.nextUrl.searchParams.has("login")) {
    await clearStartIntent();
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }
  return start(req, req.nextUrl.searchParams.get("design"), false);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  await rememberSampleName(String(form.get("name") ?? ""));
  return start(req, String(form.get("design") ?? ""), true);
}
