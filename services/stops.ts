import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db, type Executor } from "@/lib/db/client";
import { deliveryStops } from "@/lib/db/schema";
import type { DeliveryStop } from "@/types/stop";

type StopRow = typeof deliveryStops.$inferSelect;

function mapToStop(row: StopRow): DeliveryStop {
  return {
    id: String(row.id),
    deliveryRecordId: String(row.deliveryId),
    stopNumber: row.stopNumber,
    fromLocation: row.fromLocation ?? "",
    toLocation: row.toLocation ?? "",
    dropoffLocation: row.dropoffLocation ?? "",
    distanceKm: row.distanceKm != null ? Number(row.distanceKm) : null,
    plannedDistanceKm: row.plannedDistanceKm != null ? Number(row.plannedDistanceKm) : null,
    startedAt: row.startedTime?.toISOString() ?? null,
    arrivedAt: row.arrivedTime?.toISOString() ?? null,
    durationMins: row.durationMins ?? null,
    status: row.status,
    startGps: row.startLat != null && row.startLng != null ? { lat: row.startLat, lng: row.startLng } : null,
    riderGps: row.riderLat != null && row.riderLng != null ? { lat: row.riderLat, lng: row.riderLng } : null,
    riderIp: row.riderIp ?? null,
  };
}

export async function getStopsForDelivery(
  deliveryRecordId: string,
  tx: Executor = db
): Promise<DeliveryStop[]> {
  const map = await getStopsForDeliveries([deliveryRecordId], tx);
  return map.get(deliveryRecordId) ?? [];
}

export async function getStopsForDeliveries(
  deliveryIds: string[],
  tx: Executor = db
): Promise<Map<string, DeliveryStop[]>> {
  if (!deliveryIds.length) return new Map();

  const pks = deliveryIds.map(Number).filter(Number.isInteger);
  const rows = await tx
    .select()
    .from(deliveryStops)
    .where(inArray(deliveryStops.deliveryId, pks))
    .orderBy(asc(deliveryStops.stopNumber));

  const map = new Map<string, DeliveryStop[]>();
  for (const row of rows) {
    const key = String(row.deliveryId);
    const stop = mapToStop(row);
    const existing = map.get(key) ?? [];
    existing.push(stop);
    map.set(key, existing);
  }
  return map;
}

/** Clears all stops for a delivery so they can be re-created (used when editing a delivery's route, not when deleting the delivery itself — that case relies on the ON DELETE CASCADE FK instead). */
export async function replaceStopsForDelivery(deliveryRecordId: string, tx: Executor = db): Promise<void> {
  const pk = Number(deliveryRecordId);
  await tx.delete(deliveryStops).where(eq(deliveryStops.deliveryId, pk));
}

export async function createStop(
  data: {
    deliveryRecordId: string;
    stopNumber: number;
    fromLocation: string;
    toLocation: string;
    distanceKm?: number;
  },
  tx: Executor = db
): Promise<DeliveryStop> {
  const [row] = await tx
    .insert(deliveryStops)
    .values({
      deliveryId: Number(data.deliveryRecordId),
      stopNumber: data.stopNumber,
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
      distanceKm: data.distanceKm !== undefined ? String(data.distanceKm) : undefined,
      status: "Pending",
    })
    .returning();
  return mapToStop(row);
}

export async function startStop(
  stopId: string,
  gps?: { lat: number; lng: number },
  tx: Executor = db
): Promise<void> {
  const pk = Number(stopId);
  await tx
    .update(deliveryStops)
    .set({
      status: "In Progress",
      startedTime: new Date(),
      ...(gps && { startLat: gps.lat, startLng: gps.lng }),
    })
    .where(eq(deliveryStops.id, pk));
}

export async function completeStop(
  stopId: string,
  data: {
    gps?: { lat: number; lng: number };
    ip?: string;
    startedAt?: string;
  },
  tx: Executor = db
): Promise<void> {
  const pk = Number(stopId);
  const now = new Date();

  let durationMins: number | undefined;
  if (data.startedAt) {
    const startTime = new Date(data.startedAt);
    durationMins = Math.round((now.getTime() - startTime.getTime()) / 60000);
  }

  await tx
    .update(deliveryStops)
    .set({
      status: "Completed",
      arrivedTime: now,
      ...(durationMins !== undefined && { durationMins }),
      ...(data.gps && { riderLat: data.gps.lat, riderLng: data.gps.lng }),
      ...(data.ip && { riderIp: data.ip }),
    })
    .where(eq(deliveryStops.id, pk));
}
