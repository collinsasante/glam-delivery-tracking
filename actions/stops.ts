"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { completeStop, startStop } from "@/services/stops";
import { getStopsForDelivery } from "@/services/stops";
import { updateDeliveryStatus } from "@/services/deliveries";

type ActionResult = { success: true } | { error: string };

export async function startDeliveryAction(
  deliveryId: string,
  stopId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  try {
    const now = new Date();
    await updateDeliveryStatus(deliveryId, "In Progress", {
      pickupTime: now.toTimeString().slice(0, 5),
    });
    await startStop(stopId);
    revalidatePath("/rider");
    return { success: true };
  } catch (err) {
    console.error("startDelivery error:", err);
    return { error: "Failed to start delivery." };
  }
}

export async function markArrivedAction(
  deliveryId: string,
  stopId: string,
  data: {
    gps?: { lat: number; lng: number };
    ip?: string;
    startedAt?: string;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  try {
    await completeStop(stopId, data);

    // Check if all stops are completed
    const stops = await getStopsForDelivery(deliveryId);
    const allCompleted = stops.every((s) => s.id === stopId || s.status === "Completed");

    if (allCompleted) {
      const now = new Date();
      await updateDeliveryStatus(deliveryId, "Completed", {
        deliveryTime: now.toTimeString().slice(0, 5),
      });
    }

    revalidatePath("/rider");
    revalidatePath(`/rider/deliveries/${deliveryId}`);
    return { success: true };
  } catch (err) {
    console.error("markArrived error:", err);
    return { error: "Failed to mark as arrived." };
  }
}
