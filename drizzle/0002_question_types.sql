ALTER TABLE "form_fields" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "form_fields" ADD COLUMN "help" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "form_fields" ADD COLUMN "config" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "form_fields_event_role_idx" ON "form_fields" USING btree ("event_id","role") WHERE "form_fields"."role" is not null;--> statement-breakpoint
UPDATE "form_fields" SET "type" = 'short_text' WHERE "type" = 'text';--> statement-breakpoint
UPDATE "form_fields" SET "type" = 'dropdown' WHERE "type" = 'select';--> statement-breakpoint
UPDATE "form_fields" SET "position" = "position" + 2;--> statement-breakpoint
INSERT INTO "form_fields" ("event_id", "key", "label", "type", "role", "required", "position")
SELECT "id", 'name', 'Nama lengkap', 'short_text', 'name', true, 0 FROM "events";--> statement-breakpoint
INSERT INTO "form_fields" ("event_id", "key", "label", "type", "role", "required", "position")
SELECT "id", 'email', 'Email', 'email', 'email', true, 1 FROM "events";
