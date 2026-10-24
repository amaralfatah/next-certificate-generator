import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { certificates, db, submissions } from "@/lib/db";

export const PAGE_SIZE = 50;

export async function listParticipants(eventId: string, q: string, page: number) {
  const database = await db();
  const term = q.trim();
  const where = and(
    eq(submissions.eventId, eventId),
    term
      ? or(
          ilike(submissions.name, `%${term}%`),
          ilike(submissions.email, `%${term}%`),
          ilike(certificates.number, `%${term}%`),
        )
      : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    database
      .select({ sub: submissions, cert: certificates })
      .from(submissions)
      .innerJoin(certificates, eq(certificates.submissionId, submissions.id))
      .where(where)
      .orderBy(desc(submissions.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    database
      .select({ total: count() })
      .from(submissions)
      .innerJoin(certificates, eq(certificates.submissionId, submissions.id))
      .where(where),
  ]);
  return { rows, total };
}

export async function allParticipants(eventId: string) {
  return (await db())
    .select({ sub: submissions, cert: certificates })
    .from(submissions)
    .innerJoin(certificates, eq(certificates.submissionId, submissions.id))
    .where(eq(submissions.eventId, eventId))
    .orderBy(submissions.createdAt);
}

/** Every response's answers, oldest first, for the per-question summary. */
export async function allAnswers(eventId: string) {
  const rows = await (await db())
    .select({ answers: submissions.answers })
    .from(submissions)
    .where(eq(submissions.eventId, eventId))
    .orderBy(submissions.createdAt);
  return rows.map((r) => r.answers);
}
