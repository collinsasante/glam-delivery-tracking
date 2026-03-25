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
  // Fetch recent events without a date filter — most reliable way to get current state
  const records = await airtableList<ClockEventFields>("Clock Events", {
    sort: [{ field: "Timestamp", direction: "desc" as const }],
    maxRecords: "200",
  });
  const riderEvents = records.filter((r) => r.fields["Rider"]?.[0] === riderId);
  return riderEvents.length ? mapToClockEvent(riderEvents[0]) : null;
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
  if (last.date === today) return; // clocked in today — nothing to do

  // Last clock-in was a previous day — auto clock out now
  const clockInTime = new Date(last.timestamp);
  const durationMins = Math.round((Date.now() - clockInTime.getTime()) / 60000);
  await createClockEvent({ riderId, eventType: "Clock Out", durationMins });
}

export async function createClockEvent(data: {
  riderId: string;
  eventType: "Clock In" | "Clock Out";
  durationMins?: number;
}): Promise<ClockEvent> {
  const now = new Date();
  const record = await airtableCreate<ClockEventFields>("Clock Events", {
    Rider: [data.riderId],
    "Event Type": data.eventType,
    Date: now.toISOString().split("T")[0],
    Time: now.toTimeString().slice(0, 5),
    Timestamp: now.toISOString(),
    ...(data.durationMins !== undefined && {
      "Duration (mins)": data.durationMins,
    }),
  });
  return mapToClockEvent(record);
}
