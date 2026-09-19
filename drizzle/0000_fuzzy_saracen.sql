CREATE TABLE "boundaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_iso3" text NOT NULL,
	"level" integer NOT NULL,
	"level_name" text NOT NULL,
	"external_id" text NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"geometry" jsonb NOT NULL,
	"bbox" jsonb NOT NULL,
	"area_km2" numeric(14, 3) NOT NULL,
	"centroid" jsonb NOT NULL,
	"source" text DEFAULT 'geoBoundaries' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_layers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"layer_key" text NOT NULL,
	"layer_label" text NOT NULL,
	"category" text NOT NULL,
	"resolution" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"crs" text DEFAULT 'EPSG:4326' NOT NULL,
	"file_path" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"stats" jsonb NOT NULL,
	"legend" jsonb,
	"thumbnail" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"message" text DEFAULT 'Queued' NOT NULL,
	"total_layers" integer DEFAULT 0 NOT NULL,
	"completed_layers" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"owner_token" text NOT NULL,
	"share_token" text NOT NULL,
	"name" text NOT NULL,
	"country_iso3" text NOT NULL,
	"country_name" text NOT NULL,
	"level" integer NOT NULL,
	"level_name" text NOT NULL,
	"boundary_id" uuid,
	"boundary_name" text NOT NULL,
	"path_labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"geometry" jsonb NOT NULL,
	"bbox" jsonb NOT NULL,
	"area_km2" numeric(14, 3) NOT NULL,
	"resolution" integer DEFAULT 100 NOT NULL,
	"selected_layers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_custom_geometry" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "boundaries_country_level_external_idx" ON "boundaries" USING btree ("country_iso3","level","external_id");--> statement-breakpoint
CREATE INDEX "boundaries_parent_idx" ON "boundaries" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "boundaries_country_level_idx" ON "boundaries" USING btree ("country_iso3","level");--> statement-breakpoint
CREATE INDEX "generated_layers_project_idx" ON "generated_layers" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "jobs_project_idx" ON "jobs" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_share_token_idx" ON "projects" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "projects_owner_idx" ON "projects" USING btree ("owner_token");--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");