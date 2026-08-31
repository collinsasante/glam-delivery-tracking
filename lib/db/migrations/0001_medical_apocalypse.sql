ALTER TABLE "deliveries" ALTER COLUMN "delivery_code" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "riders" ALTER COLUMN "rider_code" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "riders" ALTER COLUMN "rider_code" SET DEFAULT ('R-' || lpad(nextval('rider_code_seq')::text, 3, '0'));