CREATE TABLE "content_blocks" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "content_blocks_key_check" CHECK ("content_blocks"."key" IN ('home_hero', 'home_callouts', 'about_body'))
);
