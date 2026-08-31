import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  boolean,
  date,
  time,
  timestamp,
  integer,
  doublePrecision,
  numeric,
  inet,
  unique,
  index,
  customType,
  pgSequence,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

export const riderRole = pgEnum("rider_role", ["Admin", "Rider"]);
export const vehicleType = pgEnum("vehicle_type", ["motor", "car", "bike"]);
export const warehouseEnum = pgEnum("warehouse_enum", ["Pantang West", "Amrahia"]);
export const deliveryStatus = pgEnum("delivery_status", [
  "Pending",
  "In Progress",
  "Completed",
  "On Hold",
]);
export const deliveryPriority = pgEnum("delivery_priority", ["Normal", "Urgent", "Express"]);
export const expenseStatus = pgEnum("expense_status", ["Pending", "Rejected", "Paid"]);
export const clockEventType = pgEnum("clock_event_type", ["Clock In", "Clock Out"]);
export const stopStatus = pgEnum("stop_status", ["Pending", "In Progress", "Completed"]);

export const riderCodeSeq = pgSequence("rider_code_seq");
export const deliveryCodeSeq = pgSequence("delivery_code_seq");

export const riders = pgTable(
  "riders",
  {
    id: serial("id").primaryKey(),
    riderCode: varchar("rider_code", { length: 32 })
      .notNull()
      .unique()
      .default(sql`('R-' || lpad(nextval('rider_code_seq')::text, 3, '0'))`),
    firebaseUid: varchar("firebase_uid", { length: 128 }).unique(),
    name: varchar("name", { length: 200 }).notNull(),
    email: citext("email").notNull().unique(),
    phone: varchar("phone", { length: 32 }),
    role: riderRole("role").notNull().default("Rider"),
    vehicleType: vehicleType("vehicle_type"),
    active: boolean("active").notNull().default(true),
    joinedDate: date("joined_date").notNull().defaultNow(),
    photoUrl: text("photo_url"),
    fcmToken: text("fcm_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    airtableId: text("_airtable_id").unique(),
  },
  (t) => [index("idx_riders_role_active").on(t.role, t.active)]
);

export const deliveries = pgTable(
  "deliveries",
  {
    id: serial("id").primaryKey(),
    deliveryCode: varchar("delivery_code", { length: 32 }).notNull().unique(),
    orderId: varchar("order_id", { length: 100 }).notNull(),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 32 }),
    dropoffLocation: text("dropoff_location").notNull(),
    dropoffLat: doublePrecision("dropoff_lat"),
    dropoffLng: doublePrecision("dropoff_lng"),
    assignedRiderId: integer("assigned_rider_id").references(() => riders.id, {
      onDelete: "set null",
    }),
    warehouse: warehouseEnum("warehouse").notNull(),
    status: deliveryStatus("status").notNull().default("Pending"),
    priority: deliveryPriority("priority").notNull().default("Normal"),
    createdDate: timestamp("created_date", { withTimezone: true }).notNull().defaultNow(),
    deliveryDate: date("delivery_date").notNull(),
    pickupTime: time("pickup_time"),
    deliveryTime: time("delivery_time"),
    completedDate: date("completed_date"),
    notes: text("notes"),
    riderComment: text("rider_comment"),
    distanceKm: numeric("distance_km", { precision: 6, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    airtableId: text("_airtable_id").unique(),
  },
  (t) => [
    index("idx_deliveries_status").on(t.status),
    index("idx_deliveries_rider").on(t.assignedRiderId),
    index("idx_deliveries_date").on(t.deliveryDate),
    index("idx_deliveries_search").using(
      "gin",
      sql`to_tsvector('simple', ${t.orderId} || ' ' || ${t.customerName} || ' ' || ${t.dropoffLocation})`
    ),
  ]
);

export const deliveryStops = pgTable(
  "delivery_stops",
  {
    id: serial("id").primaryKey(),
    deliveryId: integer("delivery_id")
      .notNull()
      .references(() => deliveries.id, { onDelete: "cascade" }),
    stopNumber: integer("stop_number").notNull(),
    fromLocation: text("from_location"),
    toLocation: text("to_location"),
    dropoffLocation: text("dropoff_location"),
    distanceKm: numeric("distance_km", { precision: 6, scale: 2 }),
    plannedDistanceKm: numeric("planned_distance_km", { precision: 6, scale: 2 }),
    startedTime: timestamp("started_time", { withTimezone: true }),
    arrivedTime: timestamp("arrived_time", { withTimezone: true }),
    durationMins: integer("duration_mins"),
    status: stopStatus("status").notNull().default("Pending"),
    startLat: doublePrecision("start_lat"),
    startLng: doublePrecision("start_lng"),
    riderLat: doublePrecision("rider_lat"),
    riderLng: doublePrecision("rider_lng"),
    riderIp: inet("rider_ip"),
    airtableId: text("_airtable_id").unique(),
  },
  (t) => [
    unique("uq_stops_delivery_stopnum").on(t.deliveryId, t.stopNumber),
    index("idx_stops_delivery").on(t.deliveryId),
  ]
);

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    riderId: integer("rider_id").references(() => riders.id, { onDelete: "set null" }),
    expenseType: varchar("expense_type", { length: 100 }).notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    description: text("description"),
    date: date("date").notNull(),
    receiptUrl: text("receipt_url"),
    status: expenseStatus("status").notNull().default("Pending"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    adminNotes: text("admin_notes"),
    airtableId: text("_airtable_id").unique(),
  },
  (t) => [index("idx_expenses_rider").on(t.riderId), index("idx_expenses_status").on(t.status)]
);

export const clockEvents = pgTable(
  "clock_events",
  {
    id: serial("id").primaryKey(),
    riderId: integer("rider_id").references(() => riders.id, { onDelete: "set null" }),
    eventType: clockEventType("event_type").notNull(),
    eventDate: date("event_date").notNull(),
    eventTime: time("event_time").notNull(),
    eventTimestamp: timestamp("event_timestamp", { withTimezone: true }).notNull(),
    durationMins: integer("duration_mins"),
    clockInLat: doublePrecision("clock_in_lat"),
    clockInLng: doublePrecision("clock_in_lng"),
    airtableId: text("_airtable_id").unique(),
  },
  (t) => [
    index("idx_clock_events_rider_ts").on(t.riderId, t.eventTimestamp),
    index("idx_clock_events_date").on(t.eventDate),
  ]
);
