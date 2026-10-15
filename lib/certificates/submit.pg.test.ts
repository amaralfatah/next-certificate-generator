import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DB } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { certificates, events, organizers, submissions, templates } from "@/lib/db/schema";
import { submitForm } from "./submit";

/**
 * Same concurrency guarantees as submit.test.ts, but against a real Postgres server with
 * a connection pool, where transactions genuinely run in parallel.
 * Runs only when TEST_DATABASE_URL points at a migrated database.
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("submitForm on real Postgres", () => {
  let db: DB;
  let pool: import("pg").Pool;
  let orgId: string;

  beforeAll(async () => {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    pool = new Pool({ connectionString: url, max: 20 });
    db = drizzle({ client: pool, schema }) as unknown as DB;
    const [org] = await db
      .insert(organizers)
      .values({ email: `pgtest-${Date.now()}@test.id`, name: "PG test" })
      .returning();
    orgId = org.id;
  });

  afterAll(async () => {
    if (orgId) await db.delete(organizers).where(eq(organizers.id, orgId)); // cascades
    await pool?.end();
  });

  async function makeEvent(quota: number | null) {
    const tag = Math.random().toString(36).slice(2, 8).toUpperCase();
    const [e] = await db
      .insert(events)
      .values({
        organizerId: orgId,
        slug: `pg-${tag.toLowerCase()}`,
        title: "PG",
        date: "2026-10-09",
        organizerLabel: "PG",
        numberPrefix: `PG${tag}`,
        status: "open",
        quota,
      })
      .returning();
    await db.insert(templates).values({ eventId: e.id });
    return e;
  }

  const input = (slug: string, i: number) => ({
    slug,
    name: `P ${i}`,
    email: `p${i}@mail.id`,
    answers: {},
    ipHash: null,
  });

  it("assigns 20 unique, gapless numbers to parallel submits", async () => {
    const e = await makeEvent(null);
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => submitForm(db, input(e.slug, i))));
    expect(results.every((r) => r.ok)).toBe(true);
    const rows = await db
      .select({ number: certificates.number })
      .from(certificates)
      .innerJoin(submissions, eq(submissions.id, certificates.submissionId))
      .where(eq(submissions.eventId, e.id));
    const numbers = rows.map((r) => r.number).sort();
    expect(new Set(numbers).size).toBe(20);
    expect(numbers.at(-1)).toBe(`${e.numberPrefix}-2026-00020`);
  });

  it("never exceeds the quota under parallel submits", async () => {
    const e = await makeEvent(5);
    const results = await Promise.all(Array.from({ length: 15 }, (_, i) => submitForm(db, input(e.slug, i))));
    expect(results.filter((r) => r.ok)).toHaveLength(5);
  });

  it("rejects parallel duplicates of the same email", async () => {
    const e = await makeEvent(null);
    const results = await Promise.all(Array.from({ length: 5 }, () => submitForm(db, input(e.slug, 1))));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.code === "duplicate")).toHaveLength(4);
  });
});
