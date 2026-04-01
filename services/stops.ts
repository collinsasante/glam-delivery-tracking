import "server-only";
import { airtableList, airtableCreate, airtableUpdate, escapeAirtableValue } from "@/lib/airtable";
import type { DeliveryStop } from "@/types/stop";

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
  Status?: string;
  "Start GPS"?: string;
  "Rider GPS"?: string;
  "Rider IP"?: string;
}

function parseGps(
  str?: string
): { lat: number; lng: number } | null {
  if (!str) return null;
  const [lat, lng] = str.split(",").map((s) => parseFloat(s.trim()));
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function mapToStop(
  record: { id: string; fields: StopFields }
): DeliveryStop {
  const f = record.fields;
  return {
    id: record.id,
    deliveryRecordId: f["Delivery"]?.[0] ?? "",
    stopNumber: f["Stop Number"] ?? 1,
    fromLocation: f["From Location"] ?? "",
    toLocation: f["To Location"] ?? "",
    dropoffLocation: f["Dropoff Location"] ?? "",
    distanceKm: f["Distance (km)"] ?? null,
    plannedDistanceKm: f["Planned Distance"] ? parseFloat(f["Planned Distance"]) || null : null,
    startedAt: f["Started Time"] ?? null,
    arrivedAt: f["Arrived Time"] ?? null,
    durationMins: f["Duration (mins)"] ?? null,
    status: (f["Status"] as DeliveryStop["status"]) ?? "Pending",
    startGps: parseGps(f["Start GPS"]),
    riderGps: parseGps(f["Rider GPS"]),
    riderIp: f["Rider IP"] ?? null,
  };
}

export async function getStopsForDelivery(
  deliveryRecordId: string
): Promise<DeliveryStop[]> {
  // ARRAYJOIN expands to display names — filter client-side instead.
  const map = await getStopsForDeliveries([deliveryRecordId]);
  return map.get(deliveryRecordId) ?? [];
}

export async function getStopsForDeliveries(
  deliveryIds: string[]
): Promise<Map<string, DeliveryStop[]>> {
  if (!deliveryIds.length) return new Map();

  // ARRAYJOIN({Delivery}) in Airtable formulas expands to display names, not
  // record IDs — so FIND(recordId, ARRAYJOIN({Delivery})) never matches.
  // Fetch recent stops and filter client-side using the Delivery field which
  // returns actual record IDs in the API response.
  const idSet = new Set(deliveryIds);
  const records = await airtableList<StopFields>("Delivery Stops", {
    filterByFormula: `IS_AFTER(CREATED_TIME(), DATEADD(TODAY(), -60, "days"))`,
    sort: [{ field: "Stop Number", direction: "asc" as const }],
    maxRecords: "500",
  });

  const map = new Map<string, DeliveryStop[]>();
  for (const record of records) {
    const deliveryRecId = record.fields["Delivery"]?.[0];
    if (!deliveryRecId || !idSet.has(deliveryRecId)) continue;
    const stop = mapToStop(record);
    const existing = map.get(deliveryRecId) ?? [];
    existing.push(stop);
    map.set(deliveryRecId, existing);
  }
  return map;
}

export async function createStop(data: {
  deliveryRecordId: string;
  stopNumber: number;
  fromLocation: string;
  toLocation: string;
  distanceKm?: number;
}): Promise<DeliveryStop> {
  const record = await airtableCreate<StopFields>("Delivery Stops", {
    Delivery: [data.deliveryRecordId],
    "Stop Number": data.stopNumber,
    "From Location": data.fromLocation,
    "To Location": data.toLocation,
    ...(data.distanceKm !== undefined && { "Distance (km)": data.distanceKm }),
    Status: "Pending",
  });
  return mapToStop(record);
}

export async function startStop(
  stopId: string,
  gps?: { lat: number; lng: number }
): Promise<void> {
  const fields: Record<string, unknown> = {
    Status: "In Progress",
    "Started Time": new Date().toISOString(),
  };
  if (gps) {
    fields["Start GPS"] = `${gps.lat.toFixed(6)},${gps.lng.toFixed(6)}`;
    console.log("[startStop] Start GPS stored:", fields["Start GPS"]);
  } else {
    console.warn("[startStop] No GPS provided — start location not recorded");
  }
  await airtableUpdate("Delivery Stops", stopId, fields);
}

export async function completeStop(
  stopId: string,
  data: {
    gps?: { lat: number; lng: number };
    ip?: string;
    startedAt?: string;
  }
): Promise<void> {
  const now = new Date();
  const fields: Record<string, unknown> = {
    Status: "Completed",
    "Arrived Time": now.toISOString(),
  };

  if (data.startedAt) {
    const startTime = new Date(data.startedAt);
    const durationMins = Math.round(
      (now.getTime() - startTime.getTime()) / 60000
    );
    fields["Duration (mins)"] = durationMins;
  }

  if (data.gps) {
    fields["Rider GPS"] = `${data.gps.lat.toFixed(6)}, ${data.gps.lng.toFixed(6)}`;
  }

  if (data.ip) {
    fields["Rider IP"] = data.ip;
  }

  await airtableUpdate("Delivery Stops", stopId, fields);
}

export async function deleteStopsForDelivery(
  deliveryRecordId: string
): Promise<void> {
  const stops = await getStopsForDelivery(deliveryRecordId);
  await Promise.all(
    stops.map((s) =>
      import("@/lib/airtable").then(({ airtableDelete }) =>
        airtableDelete("Delivery Stops", s.id)
      )
    )
  );
}
