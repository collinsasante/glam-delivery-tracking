CREATE EXTENSION IF NOT EXISTS "citext";--> statement-breakpoint
CREATE TYPE "public"."clock_event_type" AS ENUM('Clock In', 'Clock Out');--> statement-breakpoint
CREATE TYPE "public"."delivery_priority" AS ENUM('Normal', 'Urgent', 'Express');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('Pending', 'In Progress', 'Completed', 'On Hold');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('Pending', 'Rejected', 'Paid');--> statement-breakpoint
CREATE TYPE "public"."rider_role" AS ENUM('Admin', 'Rider');--> statement-breakpoint
CREATE TYPE "public"."stop_status" AS ENUM('Pending', 'In Progress', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('motor', 'car', 'bike');--> statement-breakpoint
CREATE TYPE "public"."warehouse_enum" AS ENUM('Pantang West', 'Amrahia');--> statement-breakpoint
CREATE SEQUENCE "public"."delivery_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."rider_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "clock_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"rider_id" integer,
	"event_type" "clock_event_type" NOT NULL,
	"event_date" date NOT NULL,
	"event_time" time NOT NULL,
	"event_timestamp" timestamp with time zone NOT NULL,
	"duration_mins" integer,
	"clock_in_lat" double precision,
	"clock_in_lng" double precision,
	"_airtable_id" text,
	CONSTRAINT "clock_events__airtable_id_unique" UNIQUE("_airtable_id")
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_code" varchar(20) NOT NULL,
	"order_id" varchar(100) NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"customer_phone" varchar(32),
	"dropoff_location" text NOT NULL,
	"dropoff_lat" double precision,
	"dropoff_lng" double precision,
	"assigned_rider_id" integer,
	"warehouse" "warehouse_enum" NOT NULL,
	"status" "delivery_status" DEFAULT 'Pending' NOT NULL,
	"priority" "delivery_priority" DEFAULT 'Normal' NOT NULL,
	"created_date" timestamp with time zone DEFAULT now() NOT NULL,
	"delivery_date" date NOT NULL,
	"pickup_time" time,
	"delivery_time" time,
	"completed_date" date,
	"notes" text,
	"rider_comment" text,
	"distance_km" numeric(6, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"_airtable_id" text,
	CONSTRAINT "deliveries_delivery_code_unique" UNIQUE("delivery_code"),
	CONSTRAINT "deliveries__airtable_id_unique" UNIQUE("_airtable_id")
);
--> statement-breakpoint
CREATE TABLE "delivery_stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_id" integer NOT NULL,
	"stop_number" integer NOT NULL,
	"from_location" text,
	"to_location" text,
	"dropoff_location" text,
	"distance_km" numeric(6, 2),
	"planned_distance_km" numeric(6, 2),
	"started_time" timestamp with time zone,
	"arrived_time" timestamp with time zone,
	"duration_mins" integer,
	"status" "stop_status" DEFAULT 'Pending' NOT NULL,
	"start_lat" double precision,
	"start_lng" double precision,
	"rider_lat" double precision,
	"rider_lng" double precision,
	"rider_ip" "inet",
	"_airtable_id" text,
	CONSTRAINT "delivery_stops__airtable_id_unique" UNIQUE("_airtable_id"),
	CONSTRAINT "uq_stops_delivery_stopnum" UNIQUE("delivery_id","stop_number")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"rider_id" integer,
	"expense_type" varchar(100) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"receipt_url" text,
	"status" "expense_status" DEFAULT 'Pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_notes" text,
	"_airtable_id" text,
	CONSTRAINT "expenses__airtable_id_unique" UNIQUE("_airtable_id")
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" serial PRIMARY KEY NOT NULL,
	"rider_code" varchar(10) DEFAULT ('R-' || lpad(nextval('rider_code_seq')::text, 3, '0')) NOT NULL,
	"firebase_uid" varchar(128),
	"name" varchar(200) NOT NULL,
	"email" "citext" NOT NULL,
	"phone" varchar(32),
	"role" "rider_role" DEFAULT 'Rider' NOT NULL,
	"vehicle_type" "vehicle_type",
	"active" boolean DEFAULT true NOT NULL,
	"joined_date" date DEFAULT now() NOT NULL,
	"photo_url" text,
	"fcm_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"_airtable_id" text,
	CONSTRAINT "riders_rider_code_unique" UNIQUE("rider_code"),
	CONSTRAINT "riders_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "riders_email_unique" UNIQUE("email"),
	CONSTRAINT "riders__airtable_id_unique" UNIQUE("_airtable_id")
);
--> statement-breakpoint
ALTER TABLE "clock_events" ADD CONSTRAINT "clock_events_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_assigned_rider_id_riders_id_fk" FOREIGN KEY ("assigned_rider_id") REFERENCES "public"."riders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_stops" ADD CONSTRAINT "delivery_stops_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_rider_id_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."riders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clock_events_rider_ts" ON "clock_events" USING btree ("rider_id","event_timestamp");--> statement-breakpoint
CREATE INDEX "idx_clock_events_date" ON "clock_events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "idx_deliveries_status" ON "deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_deliveries_rider" ON "deliveries" USING btree ("assigned_rider_id");--> statement-breakpoint
CREATE INDEX "idx_deliveries_date" ON "deliveries" USING btree ("delivery_date");--> statement-breakpoint
CREATE INDEX "idx_deliveries_search" ON "deliveries" USING gin (to_tsvector('simple', "order_id" || ' ' || "customer_name" || ' ' || "dropoff_location"));--> statement-breakpoint
CREATE INDEX "idx_stops_delivery" ON "delivery_stops" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_rider" ON "expenses" USING btree ("rider_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_status" ON "expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_riders_role_active" ON "riders" USING btree ("role","active");