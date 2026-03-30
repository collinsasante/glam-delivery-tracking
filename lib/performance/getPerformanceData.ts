import "server-only";
import { airtableList, escapeAirtableValue } from "@/lib/airtable";
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
  // 1. Active riders with role "Rider"
  const riderRecords = await airtableList<RiderFields>("Riders", {
    filterByFormula: `AND({Active} = TRUE(), {Role} = "Rider")`,
    maxRecords: "200",
  });
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

  // 3. Stops for those deliveries
  if (deliveryIds.length > 0) {
    const chunks: string[][] = [];
    for (let i = 0; i < deliveryIds.length; i += 30) {
      chunks.push(deliveryIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const stopFormula =
        chunk.length === 1
          ? `FIND("${escapeAirtableValue(chunk[0])}", ARRAYJOIN({Delivery}))`
          : `OR(${chunk.map((id) => `FIND("${escapeAirtableValue(id)}", ARRAYJOIN({Delivery}))`).join(", ")})`;

      const stopRecords = await airtableList<StopFields>("Delivery Stops", {
        filterByFormula: stopFormula,
        sort: [{ field: "Stop Number", direction: "asc" }],
      });

      for (const rec of stopRecords) {
        const deliveryRecId = rec.fields["Delivery"]?.[0];
        if (!deliveryRecId) continue;
        const meta = deliveryMeta.get(deliveryRecId);
        if (!meta?.riderId) continue;

        const riderId = meta.riderId;
        if (!stopsByRider.has(riderId)) stopsByRider.set(riderId, []);
        const pd = rec.fields["Planned Distance"];
        // Use stop's measured distance; fall back to delivery-level distance (OSRM-updated) if null
        const stopDistKm = rec.fields["Distance (km)"] ?? meta.distanceKm ?? null;
        console.log(`[perf] stop ${rec.id} distanceKm: stop=${rec.fields["Distance (km)"] ?? "null"} fallback=${meta.distanceKm ?? "null"} → ${stopDistKm}`);
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
  }

  // 4. Clock events for the period
  const clockRecords = await airtableList<ClockEventFields>("Clock Events", {
    filterByFormula: `AND({Date} >= "${range.start}", {Date} <= "${range.end}")`,
    sort: [{ field: "Timestamp", direction: "asc" }],
  });

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
  return riders.map((rider) => ({
    riderId: rider.id,
    displayId: rider.displayId,
    name: rider.name,
    photoUrl: rider.photoUrl,
    assignedStops: stopsByRider.get(rider.id) ?? [],
    clockEvents: clockByRider.get(rider.id) ?? [],
  }));
}
