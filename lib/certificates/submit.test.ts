import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createPgliteDb, type DB } from "@/lib/db/client";
import { certificates, events, formFields, organizers, submissions, templates } from "@/lib/db/schema";
import { hashCode } from "@/lib/security/crypto";
import { LIMITS, submitForm } from "./submit";

let db: DB;
let counter = 0;

async function makeEvent(over: Partial<typeof events.$inferInsert> = {}) {
  counter++;
  const [org] = await db
    .insert(organizers)
    .values({ email: `org${counter}@test.id`, name: "Org" })
    .returning();
  const [event] = await db
    .insert(events)
    .values({
      organizerId: org.id,
      slug: `acara-${counter}`,
      title: "Webinar Uji",
      date: "2026-10-09",
      organizerLabel: "Komunitas Uji",
      numberPrefix: `T${counter}`,
      status: "open",
      ...over,
    })
    .returning();
  await db.insert(templates).values({ eventId: event.id });
  return event;
}

const input = (slug: string, i = 0, extra: Partial<Parameters<typeof submitForm>[1]> = {}) => ({
  slug,
  name: `Peserta ${i}`,
  email: `peserta${i}@mail.id`,
  answers: {},
  ipHash: null,
  ...extra,
});

beforeEach(async () => {
  db = await createPgliteDb();
});

describe("submitForm", () => {
  it("issues a numbered certificate", async () => {
    const e = await makeEvent();
    const r = await submitForm(db, input(e.slug, 1));
    expect(r).toMatchObject({ ok: true, number: `${e.numberPrefix}-2026-00001` });
    const r2 = await submitForm(db, input(e.slug, 2));
    expect(r2).toMatchObject({ ok: true, number: `${e.numberPrefix}-2026-00002` });
  });

  it("rejects a second submission from the same email (case-insensitive)", async () => {
    const e = await makeEvent();
    await submitForm(db, input(e.slug, 1));
    const r = await submitForm(db, input(e.slug, 1, { email: "PESERTA1@mail.id", name: "Lain" }));
    expect(r).toMatchObject({ ok: false, code: "duplicate" });
    const subs = await db.select().from(submissions).where(eq(submissions.eventId, e.id));
    expect(subs).toHaveLength(1);
  });

  it("enforces the quota", async () => {
    const e = await makeEvent({ quota: 2 });
    expect((await submitForm(db, input(e.slug, 1))).ok).toBe(true);
    expect((await submitForm(db, input(e.slug, 2))).ok).toBe(true);
    expect(await submitForm(db, input(e.slug, 3))).toMatchObject({ ok: false, code: "unavailable" });
  });

  it("rejects closed, draft and not-yet-open forms", async () => {
    const closed = await makeEvent({ status: "closed" });
    const draft = await makeEvent({ status: "draft" });
    const past = await makeEvent({ closesAt: new Date(Date.now() - 1000) });
    const future = await makeEvent({ opensAt: new Date(Date.now() + 60_000) });
    for (const e of [closed, draft, past, future]) {
      expect(await submitForm(db, input(e.slug, 1))).toMatchObject({ ok: false, code: "unavailable" });
    }
  });

  it("checks the attendance code and locks after 5 wrong attempts per IP", async () => {
    const e = await makeEvent({ attendanceCodeHash: hashCode("HADIR26") });
    const ip = "ip-hash-1";
    for (let i = 0; i < LIMITS.codeFailures.max; i++) {
      const r = await submitForm(db, input(e.slug, 1, { attendanceCode: "SALAH", ipHash: ip }));
      expect(r).toMatchObject({ ok: false, code: "bad_code" });
    }
    const locked = await submitForm(db, input(e.slug, 1, { attendanceCode: "HADIR26", ipHash: ip }));
    expect(locked).toMatchObject({ ok: false, code: "code_locked" });
    // A different IP is not affected, and the code is case-insensitive.
    const ok = await submitForm(db, input(e.slug, 1, { attendanceCode: " hadir26 ", ipHash: "ip-hash-2" }));
    expect(ok.ok).toBe(true);
  });

  it("validates custom fields", async () => {
    const e = await makeEvent();
    await db.insert(formFields).values([
      { eventId: e.id, key: "instansi", label: "Instansi", type: "text", required: true, position: 0 },
      { eventId: e.id, key: "peran", label: "Peran", type: "select", required: false, options: ["Guru", "Siswa"], position: 1 },
    ]);
    const bad = await submitForm(db, input(e.slug, 1, { answers: { peran: "Kepala" } }));
    expect(bad).toMatchObject({ ok: false, code: "invalid" });
    if (!bad.ok) expect(Object.keys(bad.fieldErrors ?? {})).toEqual(expect.arrayContaining(["instansi", "peran"]));
    const good = await submitForm(db, input(e.slug, 1, { answers: { instansi: "SMAN 1", peran: "Guru" } }));
    expect(good.ok).toBe(true);
  });

  it("rejects names over 80 characters", async () => {
    const e = await makeEvent();
    const r = await submitForm(db, input(e.slug, 1, { name: "A".repeat(81) }));
    expect(r).toMatchObject({ ok: false, code: "invalid" });
  });

  it("assigns unique numbers to 20 concurrent submissions", async () => {
    const e = await makeEvent();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => submitForm(db, input(e.slug, i))));
    expect(results.every((r) => r.ok)).toBe(true);
    const rows = await db.select({ number: certificates.number }).from(certificates);
    const numbers = rows.map((r) => r.number);
    expect(new Set(numbers).size).toBe(20);
    expect(numbers.sort()).toEqual(
      Array.from({ length: 20 }, (_, i) => `${e.numberPrefix}-2026-${String(i + 1).padStart(5, "0")}`),
    );
  });

  it("keeps the quota exact under concurrency", async () => {
    const e = await makeEvent({ quota: 5 });
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => submitForm(db, input(e.slug, i))));
    expect(results.filter((r) => r.ok)).toHaveLength(5);
  });
});
