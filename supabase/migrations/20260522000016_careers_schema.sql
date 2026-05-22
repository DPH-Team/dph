CREATE TYPE "public"."application_status" AS ENUM('new', 'reviewed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time');--> statement-breakpoint
CREATE TABLE "career_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"posting_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"resume_path" text,
	"status" "application_status" DEFAULT 'new' NOT NULL,
	"internal_notes" text,
	"handled_at" timestamp with time zone,
	"consent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "career_applications_name_length_check" CHECK (char_length("career_applications"."name") between 2 and 80),
	CONSTRAINT "career_applications_email_length_check" CHECK (char_length("career_applications"."email") between 1 and 320),
	CONSTRAINT "career_applications_message_length_check" CHECK (char_length("career_applications"."message") between 10 and 4000),
	CONSTRAINT "career_applications_internal_notes_length_check" CHECK ("career_applications"."internal_notes" is null or char_length("career_applications"."internal_notes") <= 4000)
);
--> statement-breakpoint
CREATE TABLE "career_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" "employment_type" NOT NULL,
	"department" text NOT NULL,
	"description" text NOT NULL,
	"responsibilities" text[] DEFAULT '{}' NOT NULL,
	"requirements" text[] DEFAULT '{}' NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "career_postings_title_length_check" CHECK (char_length("career_postings"."title") between 1 and 120),
	CONSTRAINT "career_postings_department_length_check" CHECK (char_length("career_postings"."department") between 1 and 80),
	CONSTRAINT "career_postings_description_length_check" CHECK (char_length("career_postings"."description") between 1 and 2000)
);
--> statement-breakpoint
CREATE INDEX "career_applications_status_created_at_idx" ON "career_applications" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "career_applications_posting_id_idx" ON "career_applications" USING btree ("posting_id");--> statement-breakpoint
CREATE INDEX "career_applications_email_idx" ON "career_applications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "career_postings_sort_order_title_idx" ON "career_postings" USING btree ("sort_order","title");