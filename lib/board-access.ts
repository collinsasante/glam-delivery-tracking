import "server-only";
import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import type { Delivery } from "@/types/delivery";

/**
 * The live board shows customer names and drop-off locations, so it is NOT public:
 * - any signed-in user (admin or rider) may view it, or
 * - an unattended screen (office TV) opens /board/unlock?key=<BOARD_TOKEN> once and keeps an
 *   httpOnly cookie. Changing BOARD_TOKEN revokes every screen.
 */
export const BOARD_COOKIE = "board_key";

export function boardTokenValid(value: string | null | undefined): boolean {
  const token = process.env.BOARD_TOKEN;
  if (!token || token.length < 24 || !value) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(value);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hasBoardAccess(): Promise<boolean> {
  if (await auth()) return true;
  const jar = await cookies();
  return boardTokenValid(jar.get(BOARD_COOKIE)?.value);
}

/** Only what the board displays: no phones, notes, rider comments, coordinates or order numbers. */
export type BoardDelivery = Pick<
  Delivery,
  "id" | "deliveryId" | "customerName" | "dropoffLocation" | "assignedRiderName" | "status" | "pickupTime" | "deliveryTime" | "completedDate"
>;

export function toBoardDelivery(d: Delivery): BoardDelivery {
  return {
    id: d.id,
    deliveryId: d.deliveryId,
    customerName: d.customerName,
    dropoffLocation: d.dropoffLocation,
    assignedRiderName: d.assignedRiderName,
    status: d.status,
    pickupTime: d.pickupTime,
    deliveryTime: d.deliveryTime,
    completedDate: d.completedDate,
  };
}
