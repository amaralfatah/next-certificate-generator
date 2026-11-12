import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mail = vi.hoisted(() => ({ sent: [] as string[], limit: 100 }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: {
    appUrl: "http://localhost:3000",
    mailEnabled: true,
    get emailDailyLimit() {
      return mail.limit;
    },
  },
}));
vi.mock("@/lib/storage", () => {
  const files = new Map<string, Uint8Array>();
  return {
    storage: () => ({
      put: async (key: string, body: Uint8Array) => void files.set(key, body),
      get: async (key: string) => files.get(key) ?? new Uint8Array([1]),
    }),
  };
});
vi.mock("@/lib/mail", async (original) => ({
  ...(await original<typeof import("@/lib/mail")>()),
  sendMail: async (m: { to: string }) => {
    mail.sent.push(m.to);
    return "sent" as const;
  },
}));

import { createPgliteDb, type DB } from "@/lib/db/client";
import { certificates, events, organizers, submissions, templates } from "@/lib/db/schema";
import { retryUndelivered, undeliveredCount } from "./issue";

let db: DB;
let eventId: string;

async function addCertificate(i: number, over: Partial<typeof certificates.$inferInsert> = {}) {
  const [sub] = await db
    .insert(submissions)
    .values({ eventId, name: `Peserta ${i}`, email: `peserta${i}@mail.id` })
    .returning();
  await db.insert(certificates).values({
    submissionId: sub.id,
    number: `RT-2026-${String(i).padStart(5, "0")}`,
    pdfKey: `events/${eventId}/certificates/${i}.pdf`,
    emailStatus: "failed",
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
    ...over,
  });
}

const statuses = async () =>
  (await db.select({ number: certificates.number, s: certificates.emailStatus }).from(certificates).orderBy(certificates.number)).map((r) => r.s);

beforeEach(async () => {
  mail.sent = [];
  mail.limit = 100;
  db = await createPgliteDb();
  const [org] = await db.insert(organizers).values({ email: "org@test.id", name: "Org" }).returning();
  const [event] = await db
    .insert(events)
    .values({ organizerId: org.id, slug: "acara", title: "Webinar Uji", date: "2026-10-09", organizerLabel: "Komunitas Uji", numberPrefix: "RT", status: "open" })
    .returning();
  await db.insert(templates).values({ eventId: event.id });
  eventId = event.id;
});

describe("retryUndelivered", () => {
  it("re-sends failed emails and leaves sent and revoked certificates alone", async () => {
    await addCertificate(1);
    await addCertificate(2, { emailStatus: "sent" });
    await addCertificate(3, { status: "revoked" });
    await addCertificate(4);

    expect(await undeliveredCount(db, eventId)).toBe(2);
    expect(await retryUndelivered(db, eventId)).toMatchObject({ fixed: 2, remaining: 0, limitReached: false });
    expect(mail.sent).toEqual(["peserta1@mail.id", "peserta4@mail.id"]);
    expect(await statuses()).toEqual(["sent", "sent", "failed", "sent"]);
  });

  it("works through one batch per call, oldest first", async () => {
    for (let i = 1; i <= 5; i++) await addCertificate(i);
    expect(await retryUndelivered(db, eventId, 2)).toMatchObject({ fixed: 2, remaining: 3 });
    expect(mail.sent).toEqual(["peserta1@mail.id", "peserta2@mail.id"]);
  });

  it("stops at the daily email limit and reports what is left", async () => {
    mail.limit = 2;
    for (let i = 1; i <= 4; i++) await addCertificate(i);
    expect(await retryUndelivered(db, eventId)).toMatchObject({ fixed: 2, remaining: 2, limitReached: true });
    expect(mail.sent).toHaveLength(2);
    expect(await statuses()).toEqual(["sent", "sent", "failed", "failed"]);
  });

  it("builds a pending PDF before sending its email", async () => {
    await addCertificate(1, { pdfKey: null, emailStatus: "pending" });
    expect(await retryUndelivered(db, eventId)).toMatchObject({ fixed: 1, remaining: 0 });
    const [cert] = await db.select().from(certificates).where(eq(certificates.number, "RT-2026-00001"));
    expect(cert.pdfKey).toBeTruthy();
    expect(cert.emailStatus).toBe("sent");
  });
});
