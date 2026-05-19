CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"description_md" text DEFAULT '' NOT NULL,
	"cover_image_path" text,
	"cover_image_alt" text DEFAULT '' NOT NULL,
	"ticket_url" text,
	"featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "events_ends_after_starts" CHECK ("events"."ends_at" is null or "events"."ends_at" > "events"."starts_at"),
	CONSTRAINT "events_ticket_url_format" CHECK ("events"."ticket_url" is null or "events"."ticket_url" ~ '^https?://')
);
