-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0012: gallery_images and team_members schema
-- Hand-authored to match the Drizzle schema additions in lib/db/schema.ts.
-- RLS, triggers, and cross-schema FKs are in migration 0013.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "gallery_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_path" text NOT NULL,
	"alt" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "gallery_images_alt_length_check" CHECK (char_length("gallery_images"."alt") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"image_path" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "team_members_name_length_check" CHECK (char_length("team_members"."name") between 1 and 120),
	CONSTRAINT "team_members_role_length_check" CHECK (char_length("team_members"."role") between 1 and 120),
	CONSTRAINT "team_members_bio_length_check" CHECK (char_length("team_members"."bio") <= 1000)
);
--> statement-breakpoint
CREATE INDEX "gallery_images_sort_order_created_at_idx" ON "gallery_images" USING btree ("sort_order","created_at");
--> statement-breakpoint
CREATE INDEX "team_members_sort_order_name_idx" ON "team_members" USING btree ("sort_order","name");
