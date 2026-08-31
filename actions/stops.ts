"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { completeStop, startStop, createStop, getStopsForDelivery } from "@/services/stops";
import {
  updateDeliveryStatus,
  getDeliveryById,
  getDeliveriesForRider,
  updateDelivery,
} from "@/services/deliveries";
import { getAdminRiders } from "@/services/riders";
import { sendPushToTokens } from "@/lib/notifications";
import { sendMattermostNotification } from "@/lib/mattermost";

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

    await db.transaction(async (tx) => {
      // If no stop exists yet, auto-create one
      let resolvedStopId = stopId;
      if (!resolvedStopId) {
        const fromLocation = delivery.warehouse ?? "Warehouse";
        const stop = await createStop(
          {
            deliveryRecordId: deliveryId,
            stopNumber: 1,
            fromLocation,
            toLocation: delivery.dropoffLocation,
            ...(distanceKm !== undefined && { distanceKm }),
          },
          tx
        );
        resolvedStopId = stop.id;
      }

      await updateDeliveryStatus(
        deliveryId,
        "In Progress",
        { pickupTime: now.toTimeString().slice(0, 5) },
        tx
      );

      if (distanceKm !== undefined && distanceKm !== delivery.distance) {
        await updateDelivery(deliveryId, { distance: distanceKm }, tx);
      }

      await startStop(resolvedStopId, riderGps, tx);
    });

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
    let delivered = false;

    await db.transaction(async (tx) => {
      if (stopId) {
        await completeStop(stopId, data, tx);

        const stops = await getStopsForDelivery(deliveryId, tx);
        const allCompleted = stops.length === 0 || stops.every((s) => s.status === "Completed");
        if (!allCompleted) return;
      }

      await updateDeliveryStatus(
        deliveryId,
        "Completed",
        { deliveryTime: now.toTimeString().slice(0, 5) },
        tx
      );
      delivered = true;
    });

    if (!delivered) {
      revalidatePath("/rider");
      return { success: true };
    }

    // Notify admins
    const delivery = await getDeliveryById(deliveryId);
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

    void sendMattermostNotification(
      `✅ **Delivery completed** — ${delivery?.deliveryId ?? deliveryId} for ${delivery?.customerName ?? "a customer"}`
    );

    revalidatePath("/rider");
    revalidatePath(`/rider/deliveries/${deliveryId}`);
    return { success: true };
  } catch (err) {
    console.error("markArrived error:", err);
    return { error: err instanceof Error ? err.message : "Failed to mark as arrived." };
  }
}

export async function addDeliveryCommentAction(
  deliveryId: string,
  comment: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const trimmed = comment.trim();
  if (!trimmed) return { error: "Comment cannot be empty." };

  try {
    // Save comment and mark delivery On Hold so admin knows to follow up
    await db.transaction(async (tx) => {
      await updateDelivery(deliveryId, { riderComment: trimmed }, tx);
      await updateDeliveryStatus(deliveryId, "On Hold", undefined, tx);
    });

    const delivery = await getDeliveryById(deliveryId).catch(() => null);
    const riderName = (session.user as { name?: string } | undefined)?.name ?? "A rider";
    void sendMattermostNotification(
      `⚠️ **Delivery on hold** — ${delivery?.deliveryId ?? deliveryId} for ${delivery?.customerName ?? "a customer"}\n` +
        `${riderName}: "${trimmed}"`
    );

    revalidatePath(`/rider/deliveries/${deliveryId}`);
    revalidatePath("/rider");
    return { success: true };
  } catch (err) {
    console.error("addDeliveryComment error:", err);
    return { error: "Failed to save comment." };
  }
}
