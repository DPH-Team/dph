CREATE TABLE "tap_takeovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brewery" text NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "tap_takeovers_date_unique" UNIQUE("date"),
	CONSTRAINT "tap_takeovers_brewery_length_check" CHECK (char_length("tap_takeovers"."brewery") between 1 and 200)
);
--> statement-breakpoint
CREATE INDEX "tap_takeovers_date_idx" ON "tap_takeovers" USING btree ("date");
