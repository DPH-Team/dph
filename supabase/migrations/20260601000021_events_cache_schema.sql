-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0021: events_cache schema
-- Hand-authored to match the Drizzle schema additions in lib/db/schema.ts.
-- RLS, trigger, and cross-schema FK are in migration 0022.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "events_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"untappd_event_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"cover_image_url" text,
	"external_url" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_cache_untappd_event_id_unique" UNIQUE("untappd_event_id"),
	CONSTRAINT "events_cache_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "events_cache_starts_at_active_idx" ON "events_cache" USING btree ("starts_at") WHERE "deleted_at" IS NULL;
