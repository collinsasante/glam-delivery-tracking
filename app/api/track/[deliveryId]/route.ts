import { NextResponse } from "next/server";
import { getDeliveryById } from "@/services/deliveries";
import { getStopsForDelivery } from "@/services/stops";

export const revalidate = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  const { deliveryId } = await params;

  const delivery = await getDeliveryById(deliveryId).catch(() => null);
  if (!delivery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stops = await getStopsForDelivery(delivery.id);

  return NextResponse.json({
    deliveryId: delivery.deliveryId,
    orderId: delivery.orderId,
    customerName: delivery.customerName,
    dropoffLocation: delivery.dropoffLocation,
    status: delivery.status,
    deliveryDate: delivery.deliveryDate,
    pickupTime: delivery.pickupTime,
    deliveryTime: delivery.deliveryTime,
    stops: stops.map((s) => ({
      stopNumber: s.stopNumber,
      dropoffLocation: s.dropoffLocation,
      status: s.status,
      arrivedAt: s.arrivedAt,
    })),
  });
}
