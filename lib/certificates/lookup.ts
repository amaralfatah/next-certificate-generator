import "server-only";
import { eq } from "drizzle-orm";
import { certificates, db, events, submissions } from "@/lib/db";

/** Public-safe certificate lookup: only fields shown on the verification page. */
export async function findCertificate(number: string) {
  const [row] = await (await db())
    .select({
      id: certificates.id,
      number: certificates.number,
      status: certificates.status,
      pdfKey: certificates.pdfKey,
      emailStatus: certificates.emailStatus,
      issuedAt: certificates.createdAt,
      name: submissions.name,
      eventTitle: events.title,
      eventDate: events.date,
      organizerLabel: events.organizerLabel,
    })
    .from(certificates)
    .innerJoin(submissions, eq(submissions.id, certificates.submissionId))
    .innerJoin(events, eq(events.id, submissions.eventId))
    .where(eq(certificates.number, number.trim().toUpperCase()));
  return row ?? null;
}
