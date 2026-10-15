import "server-only";
import { getDb } from "./client";

/** Lazily-created database client (Neon in production, PGlite file locally). */
export const db = () => getDb();
export * from "./schema";
