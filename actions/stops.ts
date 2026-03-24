"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { completeStop, startStop, createStop, getStopsForDelivery } from "@/services/stops";
import { updateDeliveryStatus, getDeliveryById } from "@/services/deliveries";

type ActionResult = { success: true } | { error: string };

export async function startDeliveryAction(
  deliveryId: string,
  stopId: string | null
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  try {
    const now = new Date();

    // If no stop exists yet, auto-create one from the delivery's dropoff location
    let resolvedStopId = stopId;
    if (!resolvedStopId) {
      const delivery = await getDeliveryById(deliveryId);
      if (!delivery) return { error: "Delivery not found." };
      const stop = await createStop({
        deliveryRecordId: deliveryId,
        stopNumber: 1,
        fromLocation: delivery.warehouse ?? "Warehouse",
        toLocation: delivery.dropoffLocation,
        ...(delivery.distance != null && { distanceKm: delivery.distance }),
      });
      resolvedStopId = stop.id;
    }

    await updateDeliveryStatus(deliveryId, "In Progress", {
      pickupTime: now.toTimeString().slice(0, 5),
    });
    await startStop(resolvedStopId);
    revalidatePath("/rider");
    return { success: true };
  } catch (err) {
    console.error("startDelivery error:", err);
    return { error: "Failed to start delivery." };
  }
}

export async function markArrivedAction(
  deliveryId: string,
  stopId: string | null,
  data: {
    gps?: { lat: number; lng: number };
    ip?: string;
    startedAt?: string;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  try {
    const now = new Date();

    if (stopId) {
      await completeStop(stopId, data);

      // Check if all stops are completed
      const stops = await getStopsForDelivery(deliveryId);
      const allCompleted = stops.every((s) => s.id === stopId || s.status === "Completed");
      if (!allCompleted) {
        revalidatePath("/rider");
        return { success: true };
      }
    }

    // No stop (or all stops done) — mark delivery completed
    await updateDeliveryStatus(deliveryId, "Completed", {
      deliveryTime: now.toTimeString().slice(0, 5),
    });

    revalidatePath("/rider");
    revalidatePath(`/rider/deliveries/${deliveryId}`);
    return { success: true };
  } catch (err) {
    console.error("markArrived error:", err);
    return { error: "Failed to mark as arrived." };
  }
}
