"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { completeStop, startStop, createStop, getStopsForDelivery } from "@/services/stops";
import { updateDeliveryStatus, getDeliveryById } from "@/services/deliveries";

type ActionResult = { success: true } | { error: string };

export async function startDeliveryAction(
  deliveryId: string,
  stopId: string | null,
  riderGps?: { lat: number; lng: number }
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  try {
    const now = new Date();
    const delivery = await getDeliveryById(deliveryId);
    if (!delivery) return { error: "Delivery not found." };

    // Calculate actual distance from rider's GPS to dropoff (if GPS available)
    let distanceKm: number | undefined = delivery.distance ?? undefined;
    if (riderGps && delivery.dropoffCoordinates) {
      try {
        const { lat: dLat, lng: dLng } = delivery.dropoffCoordinates;
        const url = `https://router.project-osrm.org/route/v1/driving/${riderGps.lng},${riderGps.lat};${dLng},${dLat}?overview=false`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = await res.json();
          if (data.routes?.[0]) {
            distanceKm = Math.round((data.routes[0].distance / 1000) * 10) / 10;
          }
        }
      } catch {
        // distance calculation failed — keep existing or undefined
      }
    }

    // If no stop exists yet, auto-create one
    let resolvedStopId = stopId;
    if (!resolvedStopId) {
      const fromLocation = delivery.warehouse ?? "Warehouse";
      const stop = await createStop({
        deliveryRecordId: deliveryId,
        stopNumber: 1,
        fromLocation,
        toLocation: delivery.dropoffLocation,
        ...(distanceKm !== undefined && { distanceKm }),
      });
      resolvedStopId = stop.id;
    }

    await updateDeliveryStatus(deliveryId, "In Progress", {
      pickupTime: now.toTimeString().slice(0, 5),
    });

    // Update delivery distance with measured value if available
    if (distanceKm !== undefined && distanceKm !== delivery.distance) {
      await import("@/services/deliveries").then(({ updateDelivery }) =>
        updateDelivery(deliveryId, { distance: distanceKm })
      );
    }

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
