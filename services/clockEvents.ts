import "server-only";
import { airtableList, airtableCreate, escapeAirtableValue } from "@/lib/airtable";
import type { ClockEvent } from "@/types/clockEvent";

interface ClockEventFields {
  Rider?: string[];
  "Event Type"?: string;
  Date?: string;
  Time?: string;
  Timestamp?: string;
  "Duration (mins)"?: number;
  /** Stored as "lat,lng" text — only set on Clock In events */
  "Clock-in Location"?: string;
}

function parseLocation(str?: string): { lat: number; lng: number } | null {
  if (!str) return null;
  const [lat, lng] = str.split(",").map((s) => parseFloat(s.trim()));
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function mapToClockEvent(
  record: { id: string; fields: ClockEventFields }
): ClockEvent {
  const f = record.fields;
  return {
    id: record.id,
    riderId: f["Rider"]?.[0] ?? "",
    eventType: (f["Event Type"] as ClockEvent["eventType"]) ?? "Clock In",
    date: f["Date"] ?? "",
    time: f["Time"] ?? "",
    timestamp: f["Timestamp"] ?? "",
    durationMins: f["Duration (mins)"] ?? null,
    clockInLocation: parseLocation(f["Clock-in Location"]),
  };
}

export async function getTodayClockEvents(riderId: string): Promise<ClockEvent[]> {
  const today = new Date().toISOString().split("T")[0];
  const records = await airtableList<ClockEventFields>("Clock Events", {
    filterByFormula: `{Date} = "${escapeAirtableValue(today)}"`,
    sort: [{ field: "Timestamp", direction: "asc" as const }],
  });
  return records
    .filter((r) => r.fields["Rider"]?.[0] === riderId)
    .map(mapToClockEvent);
}

export async function getLastClockEvent(
  riderId: string
): Promise<ClockEvent | null> {
  // ARRAYJOIN({Rider}) in Airtable formulas expands to display names, not record
  // IDs — so FIND(riderId, ARRAYJOIN({Rider})) never matches. Fetch recent events
  // and filter client-side by record ID instead.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffDate = cutoff.toISOString().split("T")[0];

  const records = await airtableList<ClockEventFields>("Clock Events", {
    filterByFormula: `{Date} >= "${cutoffDate}"`,
    sort: [{ field: "Timestamp", direction: "desc" as const }],
  });

  const match = records.find((r) => r.fields["Rider"]?.[0] === riderId);
  return match ? mapToClockEvent(match) : null;
}

export async function isClockedIn(riderId: string): Promise<boolean> {
  const last = await getLastClockEvent(riderId);
  return last?.eventType === "Clock In";
}

/**
 * If the rider's last clock-in was from a previous day, auto-create a clock-out
 * so they start the new day clocked out. Call this before checking isClockedIn.
 */
export async function autoClockOutIfNeeded(riderId: string): Promise<void> {
  const last = await getLastClockEvent(riderId);
  if (!last || last.eventType !== "Clock In") return;

  const today = new Date().toISOString().split("T")[0];
  // Use the explicit date field first, then fall back to the timestamp prefix.
  // If neither is available the rider is considered clocked in today (safe default).
  const lastDate =
    last.date?.slice(0, 10) ||
    (last.timestamp ? last.timestamp.slice(0, 10) : today);

  if (lastDate >= today) return; // clocked in today or in the future — nothing to do

  // Last clock-in was a previous day — auto clock out now
  const clockInTime = last.timestamp ? new Date(last.timestamp) : new Date();
  const durationMins = Math.round((Date.now() - clockInTime.getTime()) / 60000);
  await createClockEvent({ riderId, eventType: "Clock Out", durationMins });
}

export async function createClockEvent(data: {
  riderId: string;
  eventType: "Clock In" | "Clock Out";
  durationMins?: number;
  gps?: { lat: number; lng: number };
}): Promise<ClockEvent> {
  const now = new Date();
  const fields: Record<string, unknown> = {
    Rider: [data.riderId],
    "Event Type": data.eventType,
    Date: now.toISOString().split("T")[0],
    Time: now.toTimeString().slice(0, 5),
    Timestamp: now.toISOString(),
    ...(data.durationMins !== undefined && {
      "Duration (mins)": data.durationMins,
    }),
  };
  if (data.eventType === "Clock In" && data.gps) {
    console.log("[clockEvent] Clock-in GPS (not saved — field not in Airtable):", data.gps.lat.toFixed(6), data.gps.lng.toFixed(6));
  }
  const record = await airtableCreate<ClockEventFields>("Clock Events", fields);
  return mapToClockEvent(record);
}
