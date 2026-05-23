-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0019: subscribers schema (table + checks + indexes)
-- Drizzle-generated DDL trimmed to subscribers only — no other tables were
-- present in the snapshot diff when db:generate produced this file.
-- RLS, the updated_at trigger, and the cross-schema FK live in migration 0020.
-- Phase 7 will wire the public form; the anon INSERT policy is already set up
-- in 0020 so no code changes are needed here when that phase lands.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'public_form' NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "subscribers_email_length_check" CHECK (char_length("subscribers"."email") between 3 and 320),
	CONSTRAINT "subscribers_email_format_check" CHECK ("subscribers"."email" ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
	CONSTRAINT "subscribers_email_lowercase_check" CHECK ("subscribers"."email" = lower("subscribers"."email"))
);
--> statement-breakpoint
CREATE INDEX "subscribers_subscribed_at_idx" ON "subscribers" USING btree ("subscribed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "subscribers_active_idx" ON "subscribers" USING btree ("subscribed_at" DESC NULLS LAST) WHERE "subscribers"."unsubscribed_at" is null;