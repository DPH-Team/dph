CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
--> statement-breakpoint
CREATE TABLE "weekly_hours" (
	"day_of_week" "day_of_week" PRIMARY KEY NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"open_time" time,
	"close_time" time,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "weekly_hours_times_consistent_check" CHECK (("weekly_hours"."closed" = true AND "weekly_hours"."open_time" IS NULL AND "weekly_hours"."close_time" IS NULL) OR ("weekly_hours"."closed" = false AND "weekly_hours"."open_time" IS NOT NULL AND "weekly_hours"."close_time" IS NOT NULL))
);
