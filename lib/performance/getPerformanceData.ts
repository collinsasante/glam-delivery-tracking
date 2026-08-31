import "server-only";
import { and, eq, gte, inArray, lte, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { riders, deliveries, deliveryStops, clockEvents } from "@/lib/db/schema";
import type { RiderRawData, StopRaw, ClockEventRaw, DateRange } from "./types";

export async function getPerformanceData(range: DateRange): Promise<RiderRawData[]> {
  const riderRows = await db
    .select()
    .from(riders)
    .where(and(eq(riders.active, true), eq(riders.role, "Rider")));
  if (!riderRows.length) return [];

  const riderList = riderRows.map((r) => ({
    id: r.id,
    displayId: r.riderCode,
    name: r.name,
    photoUrl: r.photoUrl ?? null,
  }));

  // Deliveries in range: by delivery date, or completed within range (so "today"
  // reflects actual completion day even if the delivery was scheduled earlier).
  const deliveryRows = await db
    .select({
      id: deliveries.id,
      assignedRiderId: deliveries.assignedRiderId,
      deliveryDate: deliveries.deliveryDate,
      distanceKm: deliveries.distanceKm,
      status: deliveries.status,
    })
    .from(deliveries)
    .where(
      or(
        and(gte(deliveries.deliveryDate, range.start), lte(deliveries.deliveryDate, range.end)),
        and(
          eq(deliveries.status, "Completed"),
          gte(deliveries.completedDate, range.start),
          lte(deliveries.completedDate, range.end)
        )
      )
    );

  const deliveryMeta = new Map(
    deliveryRows.map((d) => [
      d.id,
      {
        riderId: d.assignedRiderId,
        date: d.deliveryDate,
        distanceKm: d.distanceKm != null ? Number(d.distanceKm) : null,
        deliveryStatus: d.status,
      },
    ])
  );

  const deliveryIds = deliveryRows.map((d) => d.id);
  const stopsByRider = new Map<number, StopRaw[]>();

  if (deliveryIds.length > 0) {
    const stopRows = await db
      .select()
      .from(deliveryStops)
      .where(inArray(deliveryStops.deliveryId, deliveryIds))
      .orderBy(deliveryStops.stopNumber);

    for (const stop of stopRows) {
      const meta = deliveryMeta.get(stop.deliveryId);
      if (!meta?.riderId) continue;

      const riderId = meta.riderId;
      if (!stopsByRider.has(riderId)) stopsByRider.set(riderId, []);
      const stopDistKm = stop.distanceKm != null ? Number(stop.distanceKm) : meta.distanceKm;
      // If the stop's own status is still Pending but the delivery was marked Completed
      // (old flow: delivery marked directly without going through stop completion), treat
      // the stop as Completed so historical deliveries count toward performance.
      const effectiveStatus: StopRaw["status"] =
        stop.status === "Completed" || stop.status === "In Progress"
          ? stop.status
          : meta.deliveryStatus === "Completed"
          ? "Completed"
          : "Pending";
      stopsByRider.get(riderId)!.push({
        id: String(stop.id),
        distanceKm: stopDistKm,
        plannedDistanceKm: stop.plannedDistanceKm != null ? Number(stop.plannedDistanceKm) : null,
        durationMins: stop.durationMins ?? null,
        status: effectiveStatus,
        deliveryDate: meta.date,
        arrivedAt: stop.arrivedTime?.toISOString() ?? null,
      });
    }
  }

  const clockRows = await db
    .select()
    .from(clockEvents)
    .where(and(gte(clockEvents.eventDate, range.start), lte(clockEvents.eventDate, range.end)))
    .orderBy(clockEvents.eventTimestamp);

  const clockByRider = new Map<number, ClockEventRaw[]>();
  for (const rec of clockRows) {
    if (rec.riderId == null) continue;
    if (!clockByRider.has(rec.riderId)) clockByRider.set(rec.riderId, []);
    clockByRider.get(rec.riderId)!.push({
      eventType: rec.eventType,
      date: rec.eventDate,
      time: rec.eventTime,
      timestamp: rec.eventTimestamp.toISOString(),
      durationMins: rec.durationMins ?? null,
    });
  }

  return riderList.map((rider) => ({
    riderId: String(rider.id),
    displayId: rider.displayId,
    name: rider.name,
    photoUrl: rider.photoUrl,
    assignedStops: stopsByRider.get(rider.id) ?? [],
    clockEvents: clockByRider.get(rider.id) ?? [],
  }));
}
