CREATE TABLE "hours_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"open_time" time,
	"close_time" time,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "hours_overrides_date_unique" UNIQUE("date"),
	CONSTRAINT "hours_overrides_times_consistent_check" CHECK (("hours_overrides"."closed" = true AND "hours_overrides"."open_time" IS NULL AND "hours_overrides"."close_time" IS NULL) OR ("hours_overrides"."closed" = false AND "hours_overrides"."open_time" IS NOT NULL AND "hours_overrides"."close_time" IS NOT NULL)),
	CONSTRAINT "hours_overrides_note_length_check" CHECK (char_length("hours_overrides"."note") <= 200)
);
--> statement-breakpoint
CREATE INDEX "hours_overrides_date_idx" ON "hours_overrides" USING btree ("date");