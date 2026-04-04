"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { completeStop, startStop, createStop, getStopsForDelivery } from "@/services/stops";
import { updateDeliveryStatus, getDeliveryById, getDeliveriesForRider } from "@/services/deliveries";
import { getAdminRiders } from "@/services/riders";
import { sendPushToTokens } from "@/lib/notifications";

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

    // Enforce single-location rule: rider may run multiple simultaneous deliveries
    // only when they all share the same warehouse (pickup location).
    const riderId = session.user?.id;
    if (riderId) {
      const riderDeliveries = await getDeliveriesForRider(riderId);
      const activeDeliveries = riderDeliveries.filter((d) => d.status === "In Progress");
      if (activeDeliveries.length > 0 && activeDeliveries[0].warehouse !== delivery.warehouse) {
        return {
          error: `You already have an active delivery from ${activeDeliveries[0].warehouse}. Complete it before starting a delivery from a different location.`,
        };
      }
    }

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

    console.log("[startDeliveryAction] Starting stop", resolvedStopId, "GPS:", riderGps ?? "none", "distance:", distanceKm ?? "not measured");
    await startStop(resolvedStopId, riderGps);
    revalidatePath("/rider");
    return { success: true };
  } catch (err) {
    console.error("startDelivery error:", err);
    return { error: err instanceof Error ? err.message : String(err) };
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
      try {
        await completeStop(stopId, data);
      } catch (stopErr) {
        console.error("[markArrived] completeStop failed (non-fatal):", stopErr);
        // Stop update failed (e.g. missing Airtable field) — continue to mark delivery completed
      }

      // Check if all stops are completed
      const stops = await getStopsForDelivery(deliveryId).catch(() => []);
      const allCompleted = stops.length === 0 || stops.every((s) => s.id === stopId || s.status === "Completed");
      if (!allCompleted) {
        revalidatePath("/rider");
        return { success: true };
      }
    }

    // No stop (or all stops done) — mark delivery completed
    const delivery = await getDeliveryById(deliveryId);
    await updateDeliveryStatus(deliveryId, "Completed", {
      deliveryTime: now.toTimeString().slice(0, 5),
    });

    // Notify admins
    const admins = await getAdminRiders().catch(() => []);
    const adminTokens = admins.map((a) => a.fcmToken).filter(Boolean) as string[];
    if (adminTokens.length > 0) {
      await sendPushToTokens(
        adminTokens,
        "Delivery completed",
        `${delivery?.customerName ?? "A delivery"} has been delivered`,
        { type: "delivery_completed", deliveryId }
      );
    }

    revalidatePath("/rider");
    revalidatePath(`/rider/deliveries/${deliveryId}`);
    return { success: true };
  } catch (err) {
    console.error("markArrived error:", err);
    return { error: err instanceof Error ? err.message : "Failed to mark as arrived." };
  }
}
