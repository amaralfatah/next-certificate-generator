import "server-only";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, organizers } from "@/lib/db";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "piagam_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const key = () => new TextEncoder().encode(env.authSecret);

export async function signSession(organizerId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(organizerId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function startSession(organizerId: string) {
  (await cookies()).set(SESSION_COOKIE, await signSession(organizerId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Signs in (or registers) an organizer by verified email. */
export async function upsertOrganizer(email: string, name: string) {
  const database = await db();
  const normalized = email.trim().toLowerCase();
  const [row] = await database
    .insert(organizers)
    .values({ email: normalized, name: name || normalized.split("@")[0] })
    .onConflictDoUpdate({ target: organizers.email, set: { name: name || normalized.split("@")[0] } })
    .returning();
  return row;
}

/** The signed-in organizer, or null. Cached per request. */
export const currentOrganizer = cache(async () => {
  const id = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const [row] = await (await db()).select().from(organizers).where(eq(organizers.id, id));
  return row ?? null;
});

export async function requireOrganizer() {
  const organizer = await currentOrganizer();
  if (!organizer) redirect("/login");
  return organizer;
}
