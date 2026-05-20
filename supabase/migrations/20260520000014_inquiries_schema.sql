-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0014: inquiries schema (enums + table + indexes)
-- Drizzle-generated DDL trimmed to inquiries only — the gallery_images and
-- team_members tables this file originally contained alongside inquiries
-- already exist via 20260520000012_gallery_team_schema.sql (their Drizzle
-- snapshot was out of date when db:generate produced this file).
-- RLS, the updated_at trigger, and the cross-schema FK live in migration 0015.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE "public"."inquiry_status" AS ENUM('pending', 'confirmed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."inquiry_type" AS ENUM('reservation', 'private_event', 'press', 'general');--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "inquiry_type" NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"party_size" integer,
	"preferred_date" date,
	"preferred_time" time,
	"message" text NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"status" "inquiry_status" DEFAULT 'pending' NOT NULL,
	"internal_notes" text,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "inquiries_name_length_check" CHECK (char_length("inquiries"."name") between 2 and 80),
	CONSTRAINT "inquiries_email_length_check" CHECK (char_length("inquiries"."email") between 1 and 320),
	CONSTRAINT "inquiries_message_length_check" CHECK (char_length("inquiries"."message") between 10 and 2000),
	CONSTRAINT "inquiries_party_size_check" CHECK ("inquiries"."party_size" is null or ("inquiries"."party_size" >= 1 and "inquiries"."party_size" <= 50)),
	CONSTRAINT "inquiries_internal_notes_length_check" CHECK ("inquiries"."internal_notes" is null or char_length("inquiries"."internal_notes") <= 4000)
);
--> statement-breakpoint
CREATE INDEX "inquiries_status_created_at_idx" ON "inquiries" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inquiries_type_idx" ON "inquiries" USING btree ("type");
