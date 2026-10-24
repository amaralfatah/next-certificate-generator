import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, events, formFields, templates } from "@/lib/db";
import { todayInJakarta } from "@/lib/i18n";
import { getPreset } from "@/lib/pdf/presets";
import { eventSlug, randomSuffix } from "@/lib/slug";

export const ROLE_QUESTIONS = [
  { key: "name", label: "Nama lengkap", type: "short_text", role: "name", required: true },
  { key: "email", label: "Email", type: "email", role: "email", required: true },
] as const;

export async function prefixTaken(prefix: string, exceptEventId?: string) {
  const where = exceptEventId
    ? and(eq(events.numberPrefix, prefix), ne(events.id, exceptEventId))
    : eq(events.numberPrefix, prefix);
  const [row] = await (await db()).select({ id: events.id }).from(events).where(where);
  return !!row;
}

/** A ready-to-share form: name and email questions and a built-in certificate design (unknown ids fall back to Klasik). */
export async function createFormFor(organizer: { id: string; name: string }, presetId?: string | null) {
  const preset = getPreset(presetId) ?? getPreset("klasik")!;
  const title = "Formulir tanpa judul";
  let prefix = `F${randomSuffix(4).toUpperCase()}`;
  while (await prefixTaken(prefix)) prefix = `F${randomSuffix(4).toUpperCase()}`;
  const database = await db();
  return database.transaction(async (tx) => {
    const [event] = await tx
      .insert(events)
      .values({
        organizerId: organizer.id,
        slug: eventSlug(title),
        title,
        date: todayInJakarta(),
        organizerLabel: organizer.name,
        numberPrefix: prefix,
      })
      .returning({ id: events.id });
    await tx.insert(templates).values({
      eventId: event.id,
      preset: preset.id,
      widthPt: preset.widthPt,
      heightPt: preset.heightPt,
      fields: preset.fields,
    });
    await tx.insert(formFields).values(ROLE_QUESTIONS.map((q, position) => ({ ...q, eventId: event.id, position })));
    return event.id;
  });
}

// The landing CTA's choice has to survive the Google round trip, so it waits in a short-lived cookie.
const INTENT_COOKIE = "mulai";
// The name typed into the landing demo becomes the sample name in this organizer's certificate previews.
const SAMPLE_NAME_COOKIE = "contoh_nama";
export const DEFAULT_SAMPLE_NAME = "Siti Rahmawati";

const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function saveStartIntent(presetId: string | null) {
  (await cookies()).set(INTENT_COOKIE, getPreset(presetId)?.id ?? "klasik", { ...cookieOpts, maxAge: 1800 });
}

export async function clearStartIntent() {
  (await cookies()).delete(INTENT_COOKIE);
}

export async function rememberSampleName(value: string) {
  const name = value.trim().slice(0, 80);
  if (name) (await cookies()).set(SAMPLE_NAME_COOKIE, name, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
}

/** The preset chosen before signing in, once: reading it clears it. */
export async function takeStartIntent() {
  const jar = await cookies();
  const value = jar.get(INTENT_COOKIE)?.value;
  if (value === undefined) return null;
  jar.delete(INTENT_COOKIE);
  return getPreset(value)?.id ?? "klasik";
}

export async function sampleName() {
  return (await cookies()).get(SAMPLE_NAME_COOKIE)?.value || DEFAULT_SAMPLE_NAME;
}

/** Where a fresh sign-in goes: the new form the landing CTA asked for, otherwise the form list. */
export async function pathAfterSignIn(organizer: { id: string; name: string }) {
  const preset = await takeStartIntent();
  return preset ? `/forms/${await createFormFor(organizer, preset)}` : "/forms";
}
