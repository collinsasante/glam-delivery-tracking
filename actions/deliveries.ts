"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createDeliverySchema } from "@/lib/validations";
import type { SessionPayload } from "@/lib/session";
import { db } from "@/lib/db/client";
import {
  createDeliveryRecord,
  getNextDeliveryNumber,
  deleteDelivery,
  updateDelivery,
} from "@/services/deliveries";
import { createStop, replaceStopsForDelivery } from "@/services/stops";
import { getRiderById } from "@/services/riders";
import { sendPushNotification } from "@/lib/notifications";
import { sendMattermostNotification } from "@/lib/mattermost";

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
    await db.transaction(async (tx) => {
      const baseNum = await getNextDeliveryNumber(tx);
      const isMulti = destinations.length > 1;

      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        const suffix = isMulti ? String.fromCharCode(65 + i) : "";
        const deliveryId = `DEL-${String(baseNum).padStart(3, "0")}${suffix ? `-${suffix}` : ""}`;

        const delivery = await createDeliveryRecord(
          {
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
          },
          tx
        );

        const fromLocation =
          i === 0 ? warehouse : destinations[i - 1].dropoffLocation;

        await createStop(
          {
            deliveryRecordId: delivery.id,
            stopNumber: 1,
            fromLocation,
            toLocation: dest.dropoffLocation,
            distanceKm: dest.distanceKm ?? undefined,
          },
          tx
        );
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deliveries");

    // Notify assigned rider
    const assignedRider = assignedRiderId
      ? await getRiderById(assignedRiderId).catch(() => null)
      : null;
    if (assignedRider?.fcmToken) {
      await sendPushNotification(
        assignedRider.fcmToken,
        "New delivery assigned",
        `You have a new delivery for ${destinations[0].customerName}`,
        { type: "delivery_assigned" }
      );
    }

    const stopSummary =
      destinations.length > 1
        ? `${destinations.length} stops starting with ${destinations[0].customerName}`
        : destinations[0].customerName;
    void sendMattermostNotification(
      `📦 **New delivery created** — ${stopSummary}\n` +
        `Warehouse: ${warehouse} · Rider: ${assignedRider?.name ?? "Unassigned"} · Priority: ${priority}`
    );

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

  const { warehouse, assignedRiderId, priority, deliveryDate, notes, destinations } =
    parsed.data;

  try {
    await db.transaction(async (tx) => {
      await replaceStopsForDelivery(id, tx);

      await updateDelivery(
        id,
        {
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
          ...(destinations[0].distanceKm != null && { distance: destinations[0].distanceKm }),
        },
        tx
      );

      await createStop(
        {
          deliveryRecordId: id,
          stopNumber: 1,
          fromLocation: warehouse,
          toLocation: destinations[0].dropoffLocation,
          distanceKm: destinations[0].distanceKm ?? undefined,
        },
        tx
      );
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
    // delivery_stops rows cascade-delete via the FK — no separate cleanup needed.
    await deleteDelivery(id);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deliveries");
    return { success: true };
  } catch (err) {
    console.error("deleteDelivery error:", err);
    return { error: "Failed to delete delivery." };
  }
}
