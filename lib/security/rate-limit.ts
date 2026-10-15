import { eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";

/**
 * Fixed-window counter stored in Postgres (works across serverless instances).
 * Increments and returns true while the count is within `limit`.
 */
export async function hit(db: DB, key: string, limit: number, windowSeconds: number) {
  const reset = sql`now() + make_interval(secs => ${windowSeconds})`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: reset })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.resetAt} < now() then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} < now() then ${reset} else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= limit;
}

/** Current count in the window without incrementing. */
export async function peek(db: DB, key: string) {
  const [row] = await db
    .select({ count: rateLimits.count, resetAt: rateLimits.resetAt })
    .from(rateLimits)
    .where(eq(rateLimits.key, key));
  if (!row || row.resetAt < new Date()) return 0;
  return row.count;
}
