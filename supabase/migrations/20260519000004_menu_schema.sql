CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"allergens" text[] DEFAULT '{}' NOT NULL,
	"image_path" text,
	"available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "menu_items_name_length_check" CHECK (char_length("menu_items"."name") between 1 and 120),
	CONSTRAINT "menu_items_description_length_check" CHECK (char_length("menu_items"."description") <= 600),
	CONSTRAINT "menu_items_price_cents_check" CHECK ("menu_items"."price_cents" >= 0 and "menu_items"."price_cents" <= 100000),
	CONSTRAINT "menu_items_allergens_check" CHECK ("menu_items"."allergens" <@ ARRAY['gluten','dairy','nuts','shellfish','egg','soy']::text[])
);
--> statement-breakpoint
CREATE TABLE "menu_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "menu_sections_slug_unique" UNIQUE("slug"),
	CONSTRAINT "menu_sections_name_length_check" CHECK (char_length("menu_sections"."name") between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_section_id_menu_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."menu_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_items_section_sort_idx" ON "menu_items" USING btree ("section_id","sort_order");--> statement-breakpoint
CREATE INDEX "menu_items_available_idx" ON "menu_items" USING btree ("available");--> statement-breakpoint
CREATE INDEX "menu_sections_sort_order_name_idx" ON "menu_sections" USING btree ("sort_order","name");