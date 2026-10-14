
import { NextResponse } from "next/server";
import { getDeliveryByCode } from "@/services/deliveries";
import { getStopsForDelivery } from "@/services/stops";

export const revalidate = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  const { deliveryId } = await params;

  const delivery = await getDeliveryByCode(deliveryId).catch(() => null);
  if (!delivery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stops = await getStopsForDelivery(delivery.id);

  // Public endpoint (codes are sequential): status and timing only, first name, no order number or addresses.
  return NextResponse.json({
    deliveryId: delivery.deliveryId,
    customerFirstName: delivery.customerName.trim().split(/\s+/)[0] ?? "",
    status: delivery.status,
    deliveryDate: delivery.deliveryDate,
    pickupTime: delivery.pickupTime,
    deliveryTime: delivery.deliveryTime,
    stops: stops.map((s) => ({
      stopNumber: s.stopNumber,
      status: s.status,
      arrivedAt: s.arrivedAt,
    })),
  });
}
