import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clockEvents } from "@/lib/db/schema";
import type { ClockEvent } from "@/types/clockEvent";

type ClockEventRow = typeof clockEvents.$inferSelect;

function mapToClockEvent(row: ClockEventRow): ClockEvent {
  return {
    id: String(row.id),
    riderId: row.riderId != null ? String(row.riderId) : "",
    eventType: row.eventType,
    date: row.eventDate,
    time: row.eventTime,
    timestamp: row.eventTimestamp.toISOString(),
    durationMins: row.durationMins ?? null,
    clockInLocation:
      row.clockInLat != null && row.clockInLng != null
        ? { lat: row.clockInLat, lng: row.clockInLng }
        : null,
  };
}

export async function getTodayClockEvents(riderId: string): Promise<ClockEvent[]> {
  const riderPk = Number(riderId);
  if (!Number.isInteger(riderPk)) return [];

  const rows = await db
    .select()
    .from(clockEvents)
    .where(
      and(eq(clockEvents.riderId, riderPk), eq(clockEvents.eventDate, todayDateString()))
    )
    .orderBy(clockEvents.eventTimestamp);
  return rows.map(mapToClockEvent);
}

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function getLastClockEvent(riderId: string): Promise<ClockEvent | null> {
  const riderPk = Number(riderId);
  if (!Number.isInteger(riderPk)) return null;

  const [row] = await db
    .select()
    .from(clockEvents)
    .where(eq(clockEvents.riderId, riderPk))
    .orderBy(desc(clockEvents.eventTimestamp))
    .limit(1);
  return row ? mapToClockEvent(row) : null;
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

  const today = todayDateString();
  const lastDate =
    last.date?.slice(0, 10) || (last.timestamp ? last.timestamp.slice(0, 10) : today);

  if (lastDate >= today) return; // clocked in today or in the future — nothing to do

  const clockInTime = last.timestamp ? new Date(last.timestamp) : new Date(lastDate + "T08:00:00");
  const midnight = new Date(lastDate + "T23:59:59");
  const durationMins = Math.max(1, Math.round((midnight.getTime() - clockInTime.getTime()) / 60000));
  await createClockEvent({ riderId, eventType: "Clock Out", durationMins });
}

export async function createClockEvent(data: {
  riderId: string;
  eventType: "Clock In" | "Clock Out";
  durationMins?: number;
  gps?: { lat: number; lng: number };
}): Promise<ClockEvent> {
  const now = new Date();
  const [row] = await db
    .insert(clockEvents)
    .values({
      riderId: Number(data.riderId),
      eventType: data.eventType,
      eventDate: now.toISOString().split("T")[0],
      eventTime: now.toTimeString().slice(0, 5),
      eventTimestamp: now,
      durationMins: data.durationMins,
      ...(data.eventType === "Clock In" &&
        data.gps && { clockInLat: data.gps.lat, clockInLng: data.gps.lng }),
    })
    .returning();
  return mapToClockEvent(row);
}
