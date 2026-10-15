import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { TemplateField } from "@/lib/pdf/types";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const organizers = pgTable("organizers", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const events = pgTable(
  "events",
  {
    id: id(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => organizers.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    date: text("date").notNull(), // ISO yyyy-mm-dd, a calendar date with no time zone
    organizerLabel: text("organizer_label").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: ["draft", "open", "closed"] }).notNull().default("draft"),
    opensAt: timestamp("opens_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    quota: integer("quota"),
    attendanceCodeHash: text("attendance_code_hash"),
    numberPrefix: text("number_prefix").notNull().unique(),
    // Last issued sequence number. Incremented with UPDATE ... RETURNING inside the
    // submit transaction, so the row lock makes numbers unique under concurrency.
    certSeq: integer("cert_seq").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("events_organizer_idx").on(t.organizerId)],
);

export const templates = pgTable("templates", {
  id: id(),
  eventId: uuid("event_id")
    .notNull()
    .unique()
    .references(() => events.id, { onDelete: "cascade" }),
  backgroundKey: text("background_key"),
  backgroundType: text("background_type", { enum: ["png", "jpg"] }),
  // Built-in vector design (lib/pdf/presets.ts); used instead of an uploaded background.
  preset: text("preset"),
  widthPt: real("width_pt").notNull().default(842),
  heightPt: real("height_pt").notNull().default(595),
  fields: jsonb("fields").$type<TemplateField[]>().notNull().default([]),
});

export const formFields = pgTable(
  "form_fields",
  {
    id: id(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: text("type", { enum: ["text", "email", "select", "number"] }).notNull(),
    required: boolean("required").notNull().default(false),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("form_fields_event_key_idx").on(t.eventId, t.key)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("submissions_event_email_idx").on(t.eventId, sql`lower(${t.email})`)],
);

export const certificates = pgTable(
  "certificates",
  {
    id: id(),
    submissionId: uuid("submission_id")
      .notNull()
      .unique()
      .references(() => submissions.id, { onDelete: "cascade" }),
    number: text("number").notNull().unique(),
    pdfKey: text("pdf_key"), // null while the PDF is pending (render failed or not done yet)
    status: text("status", { enum: ["valid", "revoked"] }).notNull().default("valid"),
    emailStatus: text("email_status", { enum: ["pending", "sent", "failed", "skipped"] })
      .notNull()
      .default("pending"),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("certificates_created_idx").on(t.createdAt)],
);

/** Fixed-window counters for rate limits (attendance code failures, submits per IP). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export type Event = typeof events.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type FormField = typeof formFields.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
