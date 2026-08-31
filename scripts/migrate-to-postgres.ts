/**
 * One-time (re-runnable) migration: Airtable -> Postgres.
 *
 * Run with (or via `npm run migrate:airtable`):
 *   DOTENV_CONFIG_PATH=.env.local node --conditions=react-server --import tsx -r dotenv/config scripts/migrate-to-postgres.ts
 *
 * (the react-server condition is needed because lib/airtable.ts and this script
 * run outside Next's bundler, where the `server-only` marker package throws
 * unconditionally — see lib/db/client.ts for the same note. dotenv is preloaded
 * via `-r`, not a plain top-of-file import, because this runs as ESM under
 * `--import tsx` — under ESM, all `import` statements are hoisted and evaluated
 * before any of this module's own code runs, so a same-file `import "dotenv/config"`
 * would load lib/db/client.ts, and throw on a missing DATABASE_URL, before ever
 * getting a chance to read .env.local. `-r` preloads before the module graph
 * resolves at all, avoiding that.)
 *
 * Requires AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and DATABASE_URL to be set
 * (e.g. via `.env.local`).
 *
 * Safe to re-run: every insert is an upsert keyed on the Airtable record id
 * (stored in the temporary `_airtable_id` column on every table), so re-running
 * this script — including as a final delta-sync right before the live cutover —
 * only touches rows that are new or changed since the last run.
 */
import { eq, sql } from "drizzle-orm";
import { writeFileSync } from "node:fs";
import { airtableList, type AirtableRecord } from "../lib/airtable";
import { db } from "../lib/db/client";
import { riders, deliveries, deliveryStops, expenses, clockEvents } from "../lib/db/schema";

type Warehouse = "Pantang West" | "Amrahia";

interface RiderFields {
  "Rider ID": string;
  Name: string;
  Email: string;
  Phone?: string;
  Role: "Admin" | "Rider";
  "Vehicle Type"?: "motor" | "car" | "bike";
  Active?: boolean;
  "Joined Date"?: string;
  "Photo URL"?: string;
  "FCM Token"?: string;
}

interface DeliveryFields {
  "Delivery ID": string;
  "Order ID": string;
  "Customer Name": string;
  "Customer Phone"?: string;
  "Dropoff Location": string;
  "Dropoff Coordinates"?: string;
  "Assigned Rider"?: string[];
  Warehouse: Warehouse;
  Status: "Pending" | "In Progress" | "Completed" | "On Hold";
  Priority: "Normal" | "Urgent" | "Express";
  "Created Date"?: string;
  "Delivery Date": string;
  "Pickup Time"?: string;
  "Delivery Time"?: string;
  "Completed Date"?: string;
  Notes?: string;
  "Rider Comment"?: string;
  Distance?: number;
}

interface StopFields {
  Delivery?: string[];
  "Stop Number"?: number;
  "From Location"?: string;
  "To Location"?: string;
  "Dropoff Location"?: string;
  "Distance (km)"?: number;
  "Planned Distance"?: string;
  "Started Time"?: string;
  "Arrived Time"?: string;
  "Duration (mins)"?: number;
  Status?: "Pending" | "In Progress" | "Completed";
  "Start GPS"?: string;
  "Rider GPS"?: string;
  "Rider IP"?: string;
}

interface ExpenseFields {
  Rider?: string[];
  "Expense Type"?: string;
  Amount?: number;
  Description?: string;
  Date?: string;
  Receipt?: { url: string }[];
  Status?: "Pending" | "Rejected" | "Paid";
  "Submitted At"?: string;
  "Admin Notes"?: string;
}

interface ClockEventFields {
  Rider?: string[];
  "Event Type"?: "Clock In" | "Clock Out";
  Date?: string;
  Time?: string;
  Timestamp?: string;
  "Duration (mins)"?: number;
  "Clock-in Location"?: string;
}

function parseLatLng(str: string | undefined): [number, number] | null {
  if (!str) return null;
  const [lat, lng] = str.split(",").map((s) => parseFloat(s.trim()));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
}

const warnings: string[] = [];
function warn(msg: string) {
  warnings.push(msg);
  console.warn(`  ! ${msg}`);
}

async function migrateRiders(): Promise<Map<string, number>> {
  console.log("\n=== Riders ===");
  const records = await airtableList<RiderFields>("Riders");
  console.log(`Fetched ${records.length} rider records from Airtable.`);

  const map = new Map<string, number>();
  let maxCode = 0;

  for (const rec of records) {
    const f = rec.fields;
    const [row] = await db
      .insert(riders)
      .values({
        riderCode: f["Rider ID"] ?? `R-UNKNOWN-${rec.id}`,
        name: f["Name"] ?? "",
        email: f["Email"] ?? `unknown-${rec.id}@invalid`,
        phone: f["Phone"],
        role: f["Role"] ?? "Rider",
        vehicleType: f["Vehicle Type"],
        active: f["Active"] ?? true,
        joinedDate: f["Joined Date"] || new Date().toISOString().split("T")[0],
        photoUrl: f["Photo URL"],
        fcmToken: f["FCM Token"],
        airtableId: rec.id,
      })
      .onConflictDoUpdate({
        target: riders.airtableId,
        set: {
          riderCode: f["Rider ID"] ?? sql`rider_code`,
          name: f["Name"] ?? "",
          email: f["Email"] ?? sql`email`,
          phone: f["Phone"],
          role: f["Role"] ?? "Rider",
          vehicleType: f["Vehicle Type"],
          active: f["Active"] ?? true,
          photoUrl: f["Photo URL"],
          fcmToken: f["FCM Token"],
          updatedAt: new Date(),
        },
      })
      .returning({ id: riders.id, riderCode: riders.riderCode });

    map.set(rec.id, row.id);
    // Bounded to a sane sequential range — a handful of historical records have
    // malformed codes (e.g. a Date.now()-derived "R-1765899687068" from an old
    // bug) that would otherwise blow up rider_code_seq to a huge number.
    const match = row.riderCode.match(/^R-(\d{1,6})$/);
    if (match) {
      maxCode = Math.max(maxCode, parseInt(match[1], 10));
    } else {
      warn(`rider ${rec.id} has a non-standard rider_code "${row.riderCode}" — excluded from rider_code_seq calculation, review manually`);
    }
  }

  await db.execute(sql`SELECT setval('rider_code_seq', ${maxCode + 1}, false)`);
  console.log(`Loaded ${map.size} riders. rider_code_seq advanced past R-${String(maxCode).padStart(3, "0")}.`);

  const [{ count }] = await db.execute<{ count: string }>(sql`SELECT count(*)::int AS count FROM riders`);
  if (Number(count) !== records.length) {
    warn(`riders row count mismatch: Airtable=${records.length} Postgres=${count}`);
  }

  return map;
}

async function migrateDeliveries(riderMap: Map<string, number>): Promise<Map<string, number>> {
  console.log("\n=== Deliveries ===");
  const records = await airtableList<DeliveryFields>("Deliveries");
  console.log(`Fetched ${records.length} delivery records from Airtable.`);

  const map = new Map<string, number>();
  let maxCode = 0;
  let missingRiderRefs = 0;
  let gpsParseFailures = 0;
  let skippedDuplicateOrders = 0;

  // A Completed delivery for a given Order ID is treated as the "real" one —
  // any non-Completed record sharing that same Order ID is very likely a
  // duplicate submission (e.g. a retry that created a new record instead of
  // reusing the failed attempt) and is skipped entirely rather than migrated.
  const completedOrderIds = new Set(
    records
      .filter((r) => r.fields["Status"] === "Completed" && r.fields["Order ID"])
      .map((r) => r.fields["Order ID"])
  );

  // Airtable never enforced uniqueness on "Delivery ID" (that's the exact race
  // condition getNextDeliveryNumber() had) — real duplicates exist in production
  // data. Postgres's new unique constraint correctly rejects them, so we
  // disambiguate with a -DUPn suffix instead of losing a delivery. To stay safe
  // across re-runs, a record that's already been migrated (matched by
  // _airtable_id) always reuses its previously-assigned code rather than
  // recomputing — recomputing could reassign a different -DUPn suffix on a
  // later run and collide with itself.
  const existing = await db
    .select({ airtableId: deliveries.airtableId, deliveryCode: deliveries.deliveryCode })
    .from(deliveries);
  const codeByAirtableId = new Map(existing.map((r) => [r.airtableId as string, r.deliveryCode]));
  const usedCodes = new Set(existing.map((r) => r.deliveryCode));

  function resolveDeliveryCode(rec: AirtableRecord<DeliveryFields>): string {
    const alreadyAssigned = codeByAirtableId.get(rec.id);
    if (alreadyAssigned) return alreadyAssigned;

    const desired = rec.fields["Delivery ID"] || `DEL-UNKNOWN-${rec.id}`;
    if (!usedCodes.has(desired)) {
      usedCodes.add(desired);
      return desired;
    }

    let n = 2;
    while (usedCodes.has(`${desired}-DUP${n}`)) n++;
    const disambiguated = `${desired}-DUP${n}`;
    usedCodes.add(disambiguated);
    warn(`delivery ${rec.id} has duplicate Delivery ID "${desired}" (already used by another Airtable record) — assigned "${disambiguated}" instead, review both manually`);
    return disambiguated;
  }

  for (const rec of records) {
    const f = rec.fields;

    if (f["Status"] !== "Completed" && f["Order ID"] && completedOrderIds.has(f["Order ID"])) {
      skippedDuplicateOrders++;
      warn(
        `delivery ${rec.id} (Delivery ID "${f["Delivery ID"]}", Order ID "${f["Order ID"]}", status "${f["Status"]}") skipped — a Completed delivery already exists for this Order ID`
      );
      continue;
    }

    const assignedRiderAirtableId = f["Assigned Rider"]?.[0];
    const assignedRiderId = assignedRiderAirtableId ? riderMap.get(assignedRiderAirtableId) : undefined;
    if (assignedRiderAirtableId && assignedRiderId === undefined) {
      missingRiderRefs++;
      warn(`delivery ${f["Delivery ID"]} (${rec.id}) references unknown rider ${assignedRiderAirtableId}`);
    }

    const coords = parseLatLng(f["Dropoff Coordinates"]);
    if (f["Dropoff Coordinates"] && !coords) {
      gpsParseFailures++;
      warn(`delivery ${f["Delivery ID"]} (${rec.id}) has unparseable Dropoff Coordinates: "${f["Dropoff Coordinates"]}"`);
    }

    const [row] = await db
      .insert(deliveries)
      .values({
        deliveryCode: resolveDeliveryCode(rec),
        orderId: f["Order ID"] ?? "",
        customerName: f["Customer Name"] ?? "",
        customerPhone: f["Customer Phone"],
        dropoffLocation: f["Dropoff Location"] ?? "",
        dropoffLat: coords?.[0],
        dropoffLng: coords?.[1],
        assignedRiderId,
        warehouse: f["Warehouse"] ?? "Pantang West",
        status: f["Status"] ?? "Pending",
        priority: f["Priority"] ?? "Normal",
        createdDate: new Date(f["Created Date"] || rec.createdTime),
        deliveryDate: f["Delivery Date"] ?? new Date().toISOString().split("T")[0],
        pickupTime: f["Pickup Time"],
        deliveryTime: f["Delivery Time"],
        completedDate: f["Completed Date"],
        notes: f["Notes"],
        riderComment: f["Rider Comment"],
        distanceKm: f["Distance"] !== undefined ? String(f["Distance"]) : undefined,
        airtableId: rec.id,
      })
      .onConflictDoUpdate({
        target: deliveries.airtableId,
        set: {
          status: f["Status"] ?? "Pending",
          assignedRiderId,
          completedDate: f["Completed Date"],
          riderComment: f["Rider Comment"],
          notes: f["Notes"],
          updatedAt: new Date(),
        },
      })
      .returning({ id: deliveries.id, deliveryCode: deliveries.deliveryCode });

    map.set(rec.id, row.id);
    // Bounded the same way as rider_code above — see that comment.
    const match = row.deliveryCode.match(/^DEL-(\d{1,6})(?:-[A-Z])?$/);
    if (match) {
      maxCode = Math.max(maxCode, parseInt(match[1], 10));
    } else {
      warn(`delivery ${rec.id} has a non-standard delivery_code "${row.deliveryCode}" — excluded from delivery_code_seq calculation, review manually`);
    }
  }

  await db.execute(sql`SELECT setval('delivery_code_seq', ${maxCode + 1}, false)`);
  console.log(
    `Loaded ${map.size} deliveries (${skippedDuplicateOrders} skipped as duplicate-order submissions, ${missingRiderRefs} missing rider refs, ${gpsParseFailures} GPS parse failures). delivery_code_seq advanced past DEL-${String(maxCode).padStart(3, "0")}.`
  );

  const [{ count }] = await db.execute<{ count: string }>(sql`SELECT count(*)::int AS count FROM deliveries`);
  const expectedCount = records.length - skippedDuplicateOrders;
  if (Number(count) !== expectedCount) {
    warn(`deliveries row count mismatch: expected(fetched-skipped)=${expectedCount} Postgres=${count}`);
  }

  return map;
}

async function migrateStops(deliveryMap: Map<string, number>): Promise<void> {
  console.log("\n=== Delivery Stops ===");
  const records = await airtableList<StopFields>("Delivery Stops");
  console.log(`Fetched ${records.length} stop records from Airtable.`);

  let loaded = 0;
  let missingDeliveryRefs = 0;

  // The old app's non-atomic delivery-edit flow (delete-stops-then-recreate, as
  // three separate Airtable calls with no transaction) could leave two stop
  // records both claiming stop_number 1 for the same delivery if a step failed
  // partway. Postgres's new (delivery_id, stop_number) unique constraint catches
  // this — bump to the next free stop_number instead of losing the record.
  // Re-run-safe the same way as delivery codes: a record already migrated
  // (matched by _airtable_id) always reuses its previously-assigned stop_number.
  const existingStops = await db
    .select({ airtableId: deliveryStops.airtableId, deliveryId: deliveryStops.deliveryId, stopNumber: deliveryStops.stopNumber })
    .from(deliveryStops);
  const stopNumberByAirtableId = new Map(existingStops.map((r) => [r.airtableId as string, r.stopNumber]));
  const usedStopNumbers = new Set(existingStops.map((r) => `${r.deliveryId}:${r.stopNumber}`));

  function resolveStopNumber(rec: AirtableRecord<StopFields>, deliveryId: number): number {
    const alreadyAssigned = stopNumberByAirtableId.get(rec.id);
    if (alreadyAssigned !== undefined) return alreadyAssigned;

    const desired = rec.fields["Stop Number"] ?? 1;
    if (!usedStopNumbers.has(`${deliveryId}:${desired}`)) {
      usedStopNumbers.add(`${deliveryId}:${desired}`);
      return desired;
    }

    let n = desired + 1;
    while (usedStopNumbers.has(`${deliveryId}:${n}`)) n++;
    usedStopNumbers.add(`${deliveryId}:${n}`);
    warn(`stop ${rec.id} has duplicate stop_number ${desired} for delivery_id ${deliveryId} (already used by another Airtable record) — assigned ${n} instead, review both manually`);
    return n;
  }

  for (const rec of records) {
    const f = rec.fields;
    const deliveryAirtableId = f["Delivery"]?.[0];
    const deliveryId = deliveryAirtableId ? deliveryMap.get(deliveryAirtableId) : undefined;
    if (!deliveryId) {
      missingDeliveryRefs++;
      warn(`stop ${rec.id} references unknown/missing delivery ${deliveryAirtableId ?? "(none)"} — skipped`);
      continue;
    }

    const startGps = parseLatLng(f["Start GPS"]);
    const riderGps = parseLatLng(f["Rider GPS"]);

    await db
      .insert(deliveryStops)
      .values({
        deliveryId,
        stopNumber: resolveStopNumber(rec, deliveryId),
        fromLocation: f["From Location"],
        toLocation: f["To Location"],
        dropoffLocation: f["Dropoff Location"],
        distanceKm: f["Distance (km)"] !== undefined ? String(f["Distance (km)"]) : undefined,
        plannedDistanceKm: f["Planned Distance"] ? String(parseFloat(f["Planned Distance"]) || 0) : undefined,
        startedTime: f["Started Time"] ? new Date(f["Started Time"]) : undefined,
        arrivedTime: f["Arrived Time"] ? new Date(f["Arrived Time"]) : undefined,
        durationMins: f["Duration (mins)"],
        status: f["Status"] ?? "Pending",
        startLat: startGps?.[0],
        startLng: startGps?.[1],
        riderLat: riderGps?.[0],
        riderLng: riderGps?.[1],
        riderIp: f["Rider IP"],
        airtableId: rec.id,
      })
      .onConflictDoUpdate({
        target: deliveryStops.airtableId,
        set: {
          status: f["Status"] ?? "Pending",
          arrivedTime: f["Arrived Time"] ? new Date(f["Arrived Time"]) : undefined,
          durationMins: f["Duration (mins)"],
        },
      });
    loaded++;
  }

  console.log(`Loaded ${loaded} stops (${missingDeliveryRefs} skipped for missing delivery refs).`);

  const [{ count }] = await db.execute<{ count: string }>(sql`SELECT count(*)::int AS count FROM delivery_stops`);
  if (Number(count) !== loaded) {
    warn(`delivery_stops row count mismatch: expected(loaded)=${loaded} Postgres=${count}`);
  }
}

async function migrateExpenses(riderMap: Map<string, number>): Promise<void> {
  console.log("\n=== Expenses ===");
  const records = await airtableList<ExpenseFields>("Expenses");
  console.log(`Fetched ${records.length} expense records from Airtable.`);

  let loaded = 0;
  let missingRiderRefs = 0;

  for (const rec of records) {
    const f = rec.fields;
    const riderAirtableId = f["Rider"]?.[0];
    const riderId = riderAirtableId ? riderMap.get(riderAirtableId) : undefined;
    if (riderAirtableId && riderId === undefined) {
      missingRiderRefs++;
      warn(`expense ${rec.id} references unknown rider ${riderAirtableId}`);
    }

    await db
      .insert(expenses)
      .values({
        riderId,
        expenseType: f["Expense Type"] ?? "Other",
        amount: String(f["Amount"] ?? 0),
        description: f["Description"],
        date: f["Date"] ?? new Date().toISOString().split("T")[0],
        receiptUrl: f["Receipt"]?.[0]?.url,
        // Preserve the historical status exactly as recorded in Airtable — the
        // app's new "defaults to Pending" behavior only applies to *new*
        // expenses created going forward, not to this historical backfill.
        status: f["Status"] ?? "Pending",
        submittedAt: f["Submitted At"] ? new Date(f["Submitted At"]) : new Date(rec.createdTime),
        adminNotes: f["Admin Notes"],
        airtableId: rec.id,
      })
      .onConflictDoUpdate({
        target: expenses.airtableId,
        set: {
          status: f["Status"] ?? "Pending",
          adminNotes: f["Admin Notes"],
        },
      });
    loaded++;
  }

  console.log(`Loaded ${loaded} expenses (${missingRiderRefs} missing rider refs).`);

  const [{ count }] = await db.execute<{ count: string }>(sql`SELECT count(*)::int AS count FROM expenses`);
  if (Number(count) !== loaded) {
    warn(`expenses row count mismatch: expected(loaded)=${loaded} Postgres=${count}`);
  }
}

async function migrateClockEvents(riderMap: Map<string, number>): Promise<void> {
  console.log("\n=== Clock Events ===");
  const records = await airtableList<ClockEventFields>("Clock Events");
  console.log(`Fetched ${records.length} clock event records from Airtable.`);

  let loaded = 0;
  let missingRiderRefs = 0;

  for (const rec of records) {
    const f = rec.fields;
    const riderAirtableId = f["Rider"]?.[0];
    const riderId = riderAirtableId ? riderMap.get(riderAirtableId) : undefined;
    if (riderAirtableId && riderId === undefined) {
      missingRiderRefs++;
      warn(`clock event ${rec.id} references unknown rider ${riderAirtableId}`);
    }

    const gps = parseLatLng(f["Clock-in Location"]);
    const timestamp = f["Timestamp"] ? new Date(f["Timestamp"]) : new Date(rec.createdTime);

    await db
      .insert(clockEvents)
      .values({
        riderId,
        eventType: f["Event Type"] ?? "Clock In",
        eventDate: f["Date"] ?? timestamp.toISOString().split("T")[0],
        eventTime: f["Time"] ?? timestamp.toTimeString().slice(0, 5),
        eventTimestamp: timestamp,
        durationMins: f["Duration (mins)"],
        clockInLat: gps?.[0],
        clockInLng: gps?.[1],
        airtableId: rec.id,
      })
      .onConflictDoNothing({ target: clockEvents.airtableId });
    loaded++;
  }

  console.log(`Loaded ${loaded} clock events (${missingRiderRefs} missing rider refs).`);

  const [{ count }] = await db.execute<{ count: string }>(sql`SELECT count(*)::int AS count FROM clock_events`);
  if (Number(count) < loaded) {
    warn(`clock_events row count lower than expected: expected(loaded)=${loaded} Postgres=${count}`);
  }
}

async function checkForeignKeyIntegrity(): Promise<void> {
  console.log("\n=== FK integrity checks ===");
  const checks: Array<[string, ReturnType<typeof sql>]> = [
    [
      "deliveries.assigned_rider_id",
      sql`SELECT count(*)::int AS n FROM deliveries WHERE assigned_rider_id IS NOT NULL AND assigned_rider_id NOT IN (SELECT id FROM riders)`,
    ],
    [
      "delivery_stops.delivery_id",
      sql`SELECT count(*)::int AS n FROM delivery_stops WHERE delivery_id NOT IN (SELECT id FROM deliveries)`,
    ],
    [
      "expenses.rider_id",
      sql`SELECT count(*)::int AS n FROM expenses WHERE rider_id IS NOT NULL AND rider_id NOT IN (SELECT id FROM riders)`,
    ],
    [
      "clock_events.rider_id",
      sql`SELECT count(*)::int AS n FROM clock_events WHERE rider_id IS NOT NULL AND rider_id NOT IN (SELECT id FROM riders)`,
    ],
  ];
  for (const [label, query] of checks) {
    const [{ n }] = await db.execute<{ n: number }>(query);
    if (n > 0) warn(`${n} orphaned rows found for ${label}`);
    else console.log(`  OK: ${label} — no orphans`);
  }
}

async function main() {
  const startedAt = new Date();
  console.log(`Starting Airtable -> Postgres migration at ${startedAt.toISOString()}`);

  const riderMap = await migrateRiders();
  const deliveryMap = await migrateDeliveries(riderMap);
  await migrateStops(deliveryMap);
  await migrateExpenses(riderMap);
  await migrateClockEvents(riderMap);
  await checkForeignKeyIntegrity();

  const report = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    warnings,
    riderCount: riderMap.size,
    deliveryCount: deliveryMap.size,
  };
  const reportPath = `migration-report.${startedAt.toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n=== Done ===`);
  console.log(`${warnings.length} warning(s). Full report written to ${reportPath}`);
  if (warnings.length > 0) {
    console.log("Review every warning above before trusting this run for the live cutover.");
  }
  process.exit(warnings.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("MIGRATION FAILED:", err);
  process.exit(1);
});
