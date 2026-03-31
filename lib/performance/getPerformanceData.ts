import "server-only";
import { airtableList } from "@/lib/airtable";
import type { RiderRawData, StopRaw, ClockEventRaw, DateRange } from "./types";

interface DeliveryFields {
  "Delivery ID": string;
  "Assigned Rider"?: string[];
  Status: string;
  "Delivery Date": string;
  /** Delivery-level distance — used as fallback when the stop has no distanceKm */
  Distance?: number;
}

interface StopFields {
  Delivery?: string[];
  "Stop Number"?: number;
  "Distance (km)"?: number;
  "Planned Distance"?: string;
  "Duration (mins)"?: number;
  "Arrived Time"?: string;
  Status?: string;
}

interface ClockEventFields {
  Rider?: string[];
  "Event Type"?: string;
  Date?: string;
  Time?: string;
  Timestamp?: string;
  "Duration (mins)"?: number;
}

interface RiderFields {
  "Rider ID": string;
  Name: string;
  "Photo URL"?: string;
  Role?: string;
  Active?: boolean;
}

export async function getPerformanceData(range: DateRange): Promise<RiderRawData[]> {
  console.log(`[performance] getPerformanceData called — range: ${range.start} → ${range.end}`);

  // 1. Active riders with role "Rider"
  const riderRecords = await airtableList<RiderFields>("Riders", {
    filterByFormula: `AND({Active} = TRUE(), {Role} = "Rider")`,
    maxRecords: "200",
  });
  console.log(`[performance] riders found: ${riderRecords.length}`, riderRecords.map(r => ({ id: r.id, name: r.fields["Name"], role: r.fields["Role"], active: r.fields["Active"] })));
  if (!riderRecords.length) return [];

  const riders = riderRecords.map((r) => ({
    id: r.id,
    displayId: r.fields["Rider ID"] ?? "",
    name: r.fields["Name"] ?? "",
    photoUrl: r.fields["Photo URL"] ?? null,
  }));

  // 2. All deliveries for the date range (all statuses — we need pending+active+completed for completion rate)
  const deliveryRecords = await airtableList<DeliveryFields>("Deliveries", {
    filterByFormula: `AND({Delivery Date} >= "${range.start}", {Delivery Date} <= "${range.end}")`,
    maxRecords: "500",
  });
  console.log(`[performance] deliveries in range: ${deliveryRecords.length}`, deliveryRecords.slice(0, 3).map(r => ({ id: r.id, date: r.fields["Delivery Date"], rider: r.fields["Assigned Rider"]?.[0], status: r.fields["Status"] })));

  const deliveryMeta = new Map<string, { riderId: string | null; date: string; distanceKm: number | null }>();
  for (const rec of deliveryRecords) {
    deliveryMeta.set(rec.id, {
      riderId: rec.fields["Assigned Rider"]?.[0] ?? null,
      date: rec.fields["Delivery Date"] ?? "",
      distanceKm: rec.fields["Distance"] ?? null,
    });
  }

  const deliveryIds = deliveryRecords.map((r) => r.id);
  const stopsByRider = new Map<string, StopRaw[]>();

  // 3. Stops for those deliveries — ARRAYJOIN({Delivery}) returns display names not record IDs,
  // so we cannot filter by delivery ID in Airtable formulas. Instead, pull all stops and join
  // client-side using the Delivery field which returns actual record IDs in the API response.
  if (deliveryIds.length > 0) {
    const deliveryIdSet = new Set(deliveryIds);
    const stopRecords = await airtableList<StopFields>("Delivery Stops", {
      sort: [{ field: "Stop Number", direction: "asc" }],
      maxRecords: "2000",
    });
    console.log(`[performance] total stops fetched: ${stopRecords.length}, delivery IDs to match: ${deliveryIds.length}`);

    for (const rec of stopRecords) {
      const deliveryRecId = rec.fields["Delivery"]?.[0];
      if (!deliveryRecId || !deliveryIdSet.has(deliveryRecId)) continue;
      const meta = deliveryMeta.get(deliveryRecId);
      if (!meta?.riderId) continue;

      const riderId = meta.riderId;
      if (!stopsByRider.has(riderId)) stopsByRider.set(riderId, []);
      const pd = rec.fields["Planned Distance"];
      const stopDistKm = rec.fields["Distance (km)"] ?? meta.distanceKm ?? null;
      stopsByRider.get(riderId)!.push({
        id: rec.id,
        distanceKm: stopDistKm,
        plannedDistanceKm: pd ? parseFloat(pd) || null : null,
        durationMins: rec.fields["Duration (mins)"] ?? null,
        status: (rec.fields["Status"] as StopRaw["status"]) ?? "Pending",
        deliveryDate: meta.date,
        arrivedAt: rec.fields["Arrived Time"] ?? null,
      });
    }
  }

  // 4. Clock events for the period
  const clockRecords = await airtableList<ClockEventFields>("Clock Events", {
    filterByFormula: `AND({Date} >= "${range.start}", {Date} <= "${range.end}")`,
    sort: [{ field: "Timestamp", direction: "asc" }],
  });
  console.log(`[performance] clock events in range: ${clockRecords.length}`, clockRecords.slice(0, 3).map(r => ({ id: r.id, rider: r.fields["Rider"]?.[0], eventType: r.fields["Event Type"], date: r.fields["Date"] })));

  const clockByRider = new Map<string, ClockEventRaw[]>();
  for (const rec of clockRecords) {
    const riderId = rec.fields["Rider"]?.[0];
    if (!riderId) continue;
    if (!clockByRider.has(riderId)) clockByRider.set(riderId, []);
    clockByRider.get(riderId)!.push({
      eventType: (rec.fields["Event Type"] as ClockEventRaw["eventType"]) ?? "Clock In",
      date: rec.fields["Date"] ?? "",
      time: rec.fields["Time"] ?? "",
      timestamp: rec.fields["Timestamp"] ?? "",
      durationMins: rec.fields["Duration (mins)"] ?? null,
    });
  }

  // 5. Assemble
  console.log(`[performance] stops by rider:`, Object.fromEntries([...stopsByRider.entries()].map(([k, v]) => [k, v.length])));
  console.log(`[performance] clock events by rider:`, Object.fromEntries([...clockByRider.entries()].map(([k, v]) => [k, v.length])));
  return riders.map((rider) => ({
    riderId: rider.id,
    displayId: rider.displayId,
    name: rider.name,
    photoUrl: rider.photoUrl,
    assignedStops: stopsByRider.get(rider.id) ?? [],
    clockEvents: clockByRider.get(rider.id) ?? [],
  }));
}
