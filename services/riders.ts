import "server-only";
import { and, eq } from "drizzle-orm";
import { db, type Executor } from "@/lib/db/client";
import { riders } from "@/lib/db/schema";
import type { Rider } from "@/types/rider";

type RiderRow = typeof riders.$inferSelect;

function mapToRider(row: RiderRow): Rider {
  return {
    id: String(row.id),
    riderId: row.riderCode,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    role: row.role,
    vehicleType: row.vehicleType ?? null,
    active: row.active,
    joinedDate: row.joinedDate,
    photoUrl: row.photoUrl ?? null,
    fcmToken: row.fcmToken ?? null,
  };
}

export async function getRiders(): Promise<Rider[]> {
  const rows = await db.select().from(riders);
  return rows.map(mapToRider);
}

export async function getActiveRiders(): Promise<Rider[]> {
  const rows = await db
    .select()
    .from(riders)
    .where(and(eq(riders.active, true), eq(riders.role, "Rider")));
  return rows.map(mapToRider);
}

export async function getRiderById(id: string): Promise<Rider | null> {
  const pk = Number(id);
  if (!Number.isInteger(pk)) return null;
  const [row] = await db.select().from(riders).where(eq(riders.id, pk)).limit(1);
  return row ? mapToRider(row) : null;
}

export async function getRiderByEmail(email: string): Promise<Rider | null> {
  const [row] = await db.select().from(riders).where(eq(riders.email, email)).limit(1);
  return row ? mapToRider(row) : null;
}

export async function createRider(
  data: {
    name: string;
    email: string;
    phone?: string;
    role: string;
    vehicleType?: string;
    active?: boolean;
  },
  tx: Executor = db
): Promise<Rider> {
  const [row] = await tx
    .insert(riders)
    .values({
      name: data.name,
      email: data.email,
      phone: data.phone ?? undefined,
      role: data.role as RiderRow["role"],
      vehicleType: (data.vehicleType as RiderRow["vehicleType"]) ?? undefined,
      active: data.active ?? true,
    })
    .returning();
  return mapToRider(row);
}

export async function updateRider(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    role: string;
    vehicleType: string;
    active: boolean;
    photoUrl: string;
  }>,
  tx: Executor = db
): Promise<Rider> {
  const pk = Number(id);
  const [row] = await tx
    .update(riders)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.role !== undefined && { role: data.role as RiderRow["role"] }),
      ...(data.vehicleType !== undefined && {
        vehicleType: data.vehicleType as RiderRow["vehicleType"],
      }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
      updatedAt: new Date(),
    })
    .where(eq(riders.id, pk))
    .returning();
  return mapToRider(row);
}

export async function deleteRider(id: string, tx: Executor = db): Promise<void> {
  const pk = Number(id);
  await tx.delete(riders).where(eq(riders.id, pk));
}

export async function updateRiderFcmToken(id: string, fcmToken: string): Promise<void> {
  const pk = Number(id);
  await db.update(riders).set({ fcmToken, updatedAt: new Date() }).where(eq(riders.id, pk));
}

export async function getAdminRiders(): Promise<Rider[]> {
  const rows = await db
    .select()
    .from(riders)
    .where(and(eq(riders.active, true), eq(riders.role, "Admin")));
  return rows.map(mapToRider);
}
