"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createClockEvent,
  getLastClockEvent,
  getTodayClockEvents,
  isClockedIn,
} from "@/services/clockEvents";

type ActionResult =
  | { success: true; timestamp: string }
  | { error: string };

export async function clockInAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const riderId = session.user?.id;
  if (!riderId) return { error: "Rider not found" };

  try {
    const alreadyIn = await isClockedIn(riderId);
    if (alreadyIn) return { error: "Already clocked in" };

    const todayEvents = await getTodayClockEvents(riderId);
    const hasClockInToday = todayEvents.some((e) => e.eventType === "Clock In");
    if (hasClockInToday) return { error: "You've already clocked in today. You can only clock in once per day." };

    const event = await createClockEvent({ riderId, eventType: "Clock In" });
    revalidatePath("/rider");
    return { success: true, timestamp: event.timestamp };
  } catch (err) {
    console.error("clockIn error:", err);
    return { error: "Failed to clock in. Please try again." };
  }
}

export async function clockOutAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const riderId = session.user?.id;
  if (!riderId) return { error: "Rider not found" };

  try {
    const lastEvent = await getLastClockEvent(riderId);
    if (!lastEvent || lastEvent.eventType !== "Clock In") {
      return { error: "Not currently clocked in" };
    }

    const clockInTime = new Date(lastEvent.timestamp);
    const durationMins = Math.round(
      (Date.now() - clockInTime.getTime()) / 60000
    );

    const event = await createClockEvent({
      riderId,
      eventType: "Clock Out",
      durationMins,
    });

    revalidatePath("/rider");
    return { success: true, timestamp: event.timestamp };
  } catch (err) {
    console.error("clockOut error:", err);
    return { error: "Failed to clock out. Please try again." };
  }
}
