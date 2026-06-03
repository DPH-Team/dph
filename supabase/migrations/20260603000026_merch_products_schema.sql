-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0026: merch_products schema
-- Hand-authored to match the Drizzle schema additions in lib/db/schema.ts.
-- RLS, trigger, and policies are in migration 0027.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "merch_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"printify_product_id" text NOT NULL,
	"title" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"category" text DEFAULT 'Other' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"printify_url" text NOT NULL,
	"image_path" text,
	"source_image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merch_products_printify_product_id_unique" UNIQUE("printify_product_id")
);
--> statement-breakpoint
CREATE INDEX "merch_products_sort_active_idx" ON "merch_products" USING btree ("sort_order") WHERE "deleted_at" IS NULL;
