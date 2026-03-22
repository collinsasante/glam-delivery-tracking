"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createDeliverySchema } from "@/lib/validations";
import type { SessionPayload } from "@/lib/session";
import {
  createDeliveryRecord,
  getNextDeliveryNumber,
  deleteDelivery,
  updateDelivery,
} from "@/services/deliveries";
import { createStop, deleteStopsForDelivery } from "@/services/stops";

type ActionResult = { success: true } | { error: string };

export async function createDeliveryAction(
  data: unknown
): Promise<ActionResult> {
  const session = await auth();
  if (!session || (session.user as SessionPayload).role !== "Admin") {
    return { error: "Unauthorized" };
  }

  const parsed = createDeliverySchema.safeParse(data);
  if (!parsed.success) {
    const firstError = Object.values(
      parsed.error.flatten().fieldErrors
    )[0]?.[0];
    return { error: firstError ?? "Invalid form data" };
  }

  const { warehouse, assignedRiderId, priority, deliveryDate, notes, destinations } =
    parsed.data;

  try {
    const baseNum = await getNextDeliveryNumber();
    const isMulti = destinations.length > 1;

    for (let i = 0; i < destinations.length; i++) {
      const dest = destinations[i];
      const suffix = isMulti ? String.fromCharCode(65 + i) : "";
      const deliveryId = `DEL-${String(baseNum).padStart(3, "0")}${suffix ? `-${suffix}` : ""}`;

      const delivery = await createDeliveryRecord({
        deliveryId,
        orderId: dest.orderId,
        customerName: dest.customerName,
        customerPhone: dest.customerPhone,
        dropoffLocation: dest.dropoffLocation,
        dropoffCoordinates: dest.coordinates
          ? `${dest.coordinates.lat},${dest.coordinates.lng}`
          : undefined,
        assignedRiderId,
        warehouse,
        priority,
        deliveryDate,
        notes,
        distanceKm: dest.distanceKm ?? undefined,
      });

      const fromLocation =
        i === 0 ? warehouse : destinations[i - 1].dropoffLocation;

      await createStop({
        deliveryRecordId: delivery.id,
        stopNumber: 1,
        fromLocation,
        toLocation: dest.dropoffLocation,
        distanceKm: dest.distanceKm ?? undefined,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deliveries");
    return { success: true };
  } catch (err) {
    console.error("createDelivery error:", err);
    return { error: "Failed to create delivery. Please try again." };
  }
}

export async function updateDeliveryAction(
  id: string,
  data: unknown
): Promise<ActionResult> {
  const session = await auth();
  if (!session || (session.user as SessionPayload).role !== "Admin") {
    return { error: "Unauthorized" };
  }

  const parsed = createDeliverySchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid form data" };
  }

  try {
    await deleteStopsForDelivery(id);

    const { warehouse, assignedRiderId, priority, deliveryDate, notes, destinations } =
      parsed.data;

    await updateDelivery(id, {
      customerName: destinations[0].customerName,
      customerPhone: destinations[0].customerPhone,
      dropoffLocation: destinations[0].dropoffLocation,
      dropoffCoordinates: destinations[0].coordinates
        ? `${destinations[0].coordinates.lat},${destinations[0].coordinates.lng}`
        : undefined,
      assignedRiderId,
      warehouse,
      priority,
      deliveryDate,
      notes,
    });

    await createStop({
      deliveryRecordId: id,
      stopNumber: 1,
      fromLocation: warehouse,
      toLocation: destinations[0].dropoffLocation,
      distanceKm: destinations[0].distanceKm ?? undefined,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deliveries");
    revalidatePath(`/dashboard/deliveries/${id}`);
    return { success: true };
  } catch (err) {
    console.error("updateDelivery error:", err);
    return { error: "Failed to update delivery." };
  }
}

export async function deleteDeliveryAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session || (session.user as SessionPayload).role !== "Admin") {
    return { error: "Unauthorized" };
  }

  try {
    await deleteStopsForDelivery(id);
    await deleteDelivery(id);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deliveries");
    return { success: true };
  } catch (err) {
    console.error("deleteDelivery error:", err);
    return { error: "Failed to delete delivery." };
  }
}
