import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, type Executor } from "@/lib/db/client";
import { deliveries } from "@/lib/db/schema";
import type { Delivery, DeliveryStatus } from "@/types/delivery";

type DeliveryRow = typeof deliveries.$inferSelect;

function mapToDelivery(row: DeliveryRow): Delivery {
  return {
    id: String(row.id),
    deliveryId: row.deliveryCode,
    orderId: row.orderId,
    customerName: row.customerName,
    customerPhone: row.customerPhone ?? null,
    dropoffLocation: row.dropoffLocation,
    dropoffCoordinates:
      row.dropoffLat != null && row.dropoffLng != null
        ? { lat: row.dropoffLat, lng: row.dropoffLng }
        : null,
    assignedRiderId: row.assignedRiderId != null ? String(row.assignedRiderId) : null,
    assignedRiderName: null,
    warehouse: row.warehouse,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdDate.toISOString(),
    deliveryDate: row.deliveryDate,
    pickupTime: row.pickupTime ?? null,
    deliveryTime: row.deliveryTime ?? null,
    notes: row.notes ?? null,
    riderComment: row.riderComment ?? null,
    completedDate: row.completedDate ?? null,
    distance: row.distanceKm != null ? Number(row.distanceKm) : null,
  };
}

export interface DeliveryFilters {
  status?: DeliveryStatus | "All";
  riderId?: string;
  date?: "today" | "week" | "month" | "all";
  search?: string;
}

export async function getDeliveries(filters: DeliveryFilters = {}): Promise<Delivery[]> {
  const conditions = [];

  if (filters.status && filters.status !== "All") {
    conditions.push(eq(deliveries.status, filters.status));
  }

  if (filters.riderId) {
    const riderPk = Number(filters.riderId);
    if (Number.isInteger(riderPk)) conditions.push(eq(deliveries.assignedRiderId, riderPk));
  }

  if (filters.date === "today") {
    conditions.push(sql`${deliveries.deliveryDate} = CURRENT_DATE`);
  } else if (filters.date === "week") {
    conditions.push(
      sql`date_trunc('week', ${deliveries.deliveryDate}) = date_trunc('week', CURRENT_DATE)`
    );
  } else if (filters.date === "month") {
    conditions.push(
      sql`date_trunc('month', ${deliveries.deliveryDate}) = date_trunc('month', CURRENT_DATE)`
    );
  }

  if (filters.search) {
    const q = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(deliveries.orderId, q),
        ilike(deliveries.customerName, q),
        ilike(deliveries.dropoffLocation, q)
      )
    );
  }

  const rows = await db
    .select()
    .from(deliveries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(deliveries.createdAt));

  return rows.map(mapToDelivery);
}

export async function getDeliveryById(id: string): Promise<Delivery | null> {
  const pk = Number(id);
  if (!Number.isInteger(pk)) return null;
  const [row] = await db.select().from(deliveries).where(eq(deliveries.id, pk)).limit(1);
  return row ? mapToDelivery(row) : null;
}

export async function getDeliveryByCode(code: string): Promise<Delivery | null> {
  const [row] = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.deliveryCode, code))
    .limit(1);
  return row ? mapToDelivery(row) : null;
}

export async function getDeliveriesForRider(riderId: string): Promise<Delivery[]> {
  return getDeliveries({ riderId });
}

/** Atomically reserves the next delivery number (backs the DEL-NNN / DEL-NNN-A/B/C codes). */
export async function getNextDeliveryNumber(tx: Executor = db): Promise<number> {
  const [{ val }] = await tx.execute<{ val: string }>(sql`SELECT nextval('delivery_code_seq') AS val`);
  return Number(val);
}

export async function createDeliveryRecord(
  fields: {
    deliveryId: string;
    orderId: string;
    customerName: string;
    customerPhone?: string;
    dropoffLocation: string;
    dropoffCoordinates?: string;
    assignedRiderId?: string;
    warehouse: string;
    priority: string;
    deliveryDate: string;
    notes?: string;
    distanceKm?: number;
  },
  tx: Executor = db
): Promise<Delivery> {
  const coords = fields.dropoffCoordinates
    ? fields.dropoffCoordinates.split(",").map(Number)
    : undefined;

  const [row] = await tx
    .insert(deliveries)
    .values({
      deliveryCode: fields.deliveryId,
      orderId: fields.orderId,
      customerName: fields.customerName,
      customerPhone: fields.customerPhone,
      dropoffLocation: fields.dropoffLocation,
      dropoffLat: coords && !Number.isNaN(coords[0]) ? coords[0] : undefined,
      dropoffLng: coords && !Number.isNaN(coords[1]) ? coords[1] : undefined,
      assignedRiderId: fields.assignedRiderId ? Number(fields.assignedRiderId) : undefined,
      warehouse: fields.warehouse as DeliveryRow["warehouse"],
      status: "Pending",
      priority: fields.priority as DeliveryRow["priority"],
      deliveryDate: fields.deliveryDate,
      notes: fields.notes,
      distanceKm: fields.distanceKm !== undefined ? String(fields.distanceKm) : undefined,
    })
    .returning();
  return mapToDelivery(row);
}

export async function updateDeliveryStatus(
  id: string,
  status: DeliveryStatus,
  extra?: { pickupTime?: string; deliveryTime?: string },
  tx: Executor = db
): Promise<void> {
  const pk = Number(id);
  await tx
    .update(deliveries)
    .set({
      status,
      ...(extra?.pickupTime && { pickupTime: extra.pickupTime }),
      ...(extra?.deliveryTime && { deliveryTime: extra.deliveryTime }),
      ...(status === "Completed" && {
        completedDate: new Date().toISOString().split("T")[0],
      }),
      updatedAt: new Date(),
    })
    .where(eq(deliveries.id, pk));
}

export async function updateDelivery(
  id: string,
  fields: Partial<{
    orderId: string;
    customerName: string;
    customerPhone: string;
    dropoffLocation: string;
    dropoffCoordinates: string;
    assignedRiderId: string;
    warehouse: string;
    priority: string;
    deliveryDate: string;
    notes: string;
    riderComment: string;
    distance: number;
  }>,
  tx: Executor = db
): Promise<void> {
  const pk = Number(id);
  const coords = fields.dropoffCoordinates
    ? fields.dropoffCoordinates.split(",").map(Number)
    : undefined;

  await tx
    .update(deliveries)
    .set({
      ...(fields.orderId !== undefined && { orderId: fields.orderId }),
      ...(fields.customerName !== undefined && { customerName: fields.customerName }),
      ...(fields.customerPhone !== undefined && { customerPhone: fields.customerPhone }),
      ...(fields.dropoffLocation !== undefined && { dropoffLocation: fields.dropoffLocation }),
      ...(coords && {
        dropoffLat: !Number.isNaN(coords[0]) ? coords[0] : null,
        dropoffLng: !Number.isNaN(coords[1]) ? coords[1] : null,
      }),
      ...(fields.assignedRiderId !== undefined && {
        assignedRiderId: Number(fields.assignedRiderId),
      }),
      ...(fields.warehouse !== undefined && {
        warehouse: fields.warehouse as DeliveryRow["warehouse"],
      }),
      ...(fields.priority !== undefined && {
        priority: fields.priority as DeliveryRow["priority"],
      }),
      ...(fields.deliveryDate !== undefined && { deliveryDate: fields.deliveryDate }),
      ...(fields.notes !== undefined && { notes: fields.notes }),
      ...(fields.riderComment !== undefined && { riderComment: fields.riderComment }),
      ...(fields.distance !== undefined && { distanceKm: String(fields.distance) }),
      updatedAt: new Date(),
    })
    .where(eq(deliveries.id, pk));
}

export async function deleteDelivery(id: string, tx: Executor = db): Promise<void> {
  const pk = Number(id);
  // delivery_stops rows cascade-delete via the FK — no separate cleanup needed.
  await tx.delete(deliveries).where(eq(deliveries.id, pk));
}
