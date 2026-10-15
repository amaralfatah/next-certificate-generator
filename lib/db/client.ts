import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import path from "node:path";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __piagamDb?: Promise<DB> };

/**
 * DATABASE_URL on neon.tech: Neon serverless driver over WebSocket (supports transactions).
 * Any other DATABASE_URL: node-postgres (e.g. a local Postgres during development).
 * Not set: an embedded PGlite database in .data/pglite, migrated on first use.
 */
export function getDb(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  globalForDb.__piagamDb ??= !url
    ? createPgliteDb(path.join(process.cwd(), ".data", "pglite"))
    : /\.neon\.tech\b/.test(url)
      ? createNeonDb(url)
      : createPgDb(url);
  return globalForDb.__piagamDb;
}

async function createNeonDb(url: string): Promise<DB> {
  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  if (typeof WebSocket === "undefined") neonConfig.webSocketConstructor = (await import("ws")).default;
  return drizzle({ client: new Pool({ connectionString: url }), schema }) as unknown as DB;
}

async function createPgDb(url: string): Promise<DB> {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  return drizzle({ client: new Pool({ connectionString: url, max: 10 }), schema }) as unknown as DB;
}

/** Also used by the tests with `dataDir` undefined (in-memory). */
export async function createPgliteDb(dataDir?: string): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) await (await import("node:fs/promises")).mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as DB;
}
