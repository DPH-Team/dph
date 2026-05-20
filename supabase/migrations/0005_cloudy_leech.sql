CREATE TYPE "public"."inquiry_status" AS ENUM('pending', 'confirmed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."inquiry_type" AS ENUM('reservation', 'private_event', 'press', 'general');--> statement-breakpoint
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
CREATE INDEX "gallery_images_sort_order_created_at_idx" ON "gallery_images" USING btree ("sort_order","created_at");--> statement-breakpoint
CREATE INDEX "inquiries_status_created_at_idx" ON "inquiries" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inquiries_type_idx" ON "inquiries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "team_members_sort_order_name_idx" ON "team_members" USING btree ("sort_order","name");