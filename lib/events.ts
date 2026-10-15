import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireOrganizer } from "@/lib/auth/session";
import { certificates, db, events, formFields, submissions, templates } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Loads an event owned by the signed-in organizer, or 404. Every dashboard query goes through here. */
export const getOwnedEvent = cache(async (id: string) => {
  const organizer = await requireOrganizer();
  if (!UUID_RE.test(id)) notFound();
  const database = await db();
  const [row] = await database
    .select({ event: events, template: templates })
    .from(events)
    .innerJoin(templates, eq(templates.eventId, events.id))
    .where(and(eq(events.id, id), eq(events.organizerId, organizer.id)));
  if (!row) notFound();
  return { ...row, organizer, db: database };
});

export async function getFormFields(eventId: string) {
  return (await db()).select().from(formFields).where(eq(formFields.eventId, eventId)).orderBy(asc(formFields.position));
}

export async function eventStats(eventId: string) {
  const [row] = await (await db())
    .select({
      total: count(),
      revoked: sql<number>`count(*) filter (where ${certificates.status} = 'revoked')`.mapWith(Number),
      pending: sql<number>`count(*) filter (where ${certificates.pdfKey} is null)`.mapWith(Number),
      emailFailed: sql<number>`count(*) filter (where ${certificates.emailStatus} = 'failed')`.mapWith(Number),
    })
    .from(certificates)
    .innerJoin(submissions, eq(submissions.id, certificates.submissionId))
    .where(eq(submissions.eventId, eventId));
  return row;
}

export async function listEvents(organizerId: string) {
  const database = await db();
  return database
    .select({
      event: events,
      issued: sql<number>`(select count(*) from ${submissions} where ${submissions.eventId} = ${events.id})`.mapWith(Number),
      template: templates,
    })
    .from(events)
    .innerJoin(templates, eq(templates.eventId, events.id))
    .where(eq(events.organizerId, organizerId))
    .orderBy(desc(events.createdAt));
}

export async function issuedCount(eventId: string) {
  const [{ n }] = await (await db()).select({ n: count() }).from(submissions).where(eq(submissions.eventId, eventId));
  return n;
}

/** What still blocks publishing. Empty array = ready. */
export function publishBlockers(template: typeof templates.$inferSelect) {
  const blockers: string[] = [];
  if (!template.backgroundKey && !template.preset) blockers.push("Pilih template bawaan atau unggah desain sertifikat.");
  if (!template.fields.some((f) => f.key === "nama")) blockers.push("Taruh kolom Nama peserta di template.");
  return blockers;
}
