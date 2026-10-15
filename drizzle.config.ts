import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read Next's env files; load .env.local when present.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
