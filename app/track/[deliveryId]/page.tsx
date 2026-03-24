
import { notFound } from "next/navigation";
import Image from "next/image";
import { getDeliveryById } from "@/services/deliveries";
import { getStopsForDelivery } from "@/services/stops";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { MapPin, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const revalidate = 30;

interface Props {
  params: Promise<{ deliveryId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { deliveryId } = await params;
  const delivery = await getDeliveryById(deliveryId);
  return {
    title: delivery ? `Tracking · ${delivery.orderId}` : "Delivery Not Found",
  };
}

const statusConfig = {
  Pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    label: "Pending",
  },
  "In Progress": {
    dot: "bg-blue-400",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    label: "In Progress",
  },
  Completed: {
    dot: "bg-green-400",
    pill: "bg-green-50 text-green-700 border-green-200",
    label: "Delivered",
  },
};

export default async function TrackingPage({ params }: Props) {
  const { deliveryId } = await params;
  const delivery = await getDeliveryById(deliveryId).catch(() => null);

  if (!delivery) notFound();

  const stops = await getStopsForDelivery(delivery.id);

  const sc = statusConfig[delivery.status] ?? statusConfig["Pending"];

  const completedStops = stops.filter((s) => s.status === "Completed").length;
  const progressPct =
    stops.length > 0 ? Math.round((completedStops / stops.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Glam Delivery"
              width={28}
              height={28}
              className="rounded-md shrink-0"
            />
            <span className="font-semibold text-gray-900 text-sm">
              Glam Delivery
            </span>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              sc.pill
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sc.dot)} />
            {sc.label}
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Order summary card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Order
          </p>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-gray-900 truncate">
                {delivery.customerName}
              </p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                #{delivery.orderId}
              </p>
            </div>
            {delivery.status === "Completed" && (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            )}
          </div>

          <div className="flex items-start gap-2 mt-4 text-sm text-gray-600">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
            <span className="leading-snug">{delivery.dropoffLocation}</span>
          </div>

          {/* Progress bar — only when there are multiple stops */}
          {stops.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                  Progress
                </span>
                <span className="text-[10px] font-semibold text-gray-700 tabular-nums">
                  {completedStops}/{stops.length} stops
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-green-400 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Delivery times */}
        {(delivery.pickupTime || delivery.deliveryTime) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Times
            </p>
            <div className="grid grid-cols-2 gap-4">
              {delivery.pickupTime && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-400">Picked up</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 tabular-nums">
                      {delivery.pickupTime}
                    </p>
                  </div>
                </div>
              )}
              {delivery.deliveryTime && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-400">Delivered</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 tabular-nums">
                      {delivery.deliveryTime}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        {stops.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-4">
              Delivery progress
            </p>
            <TrackingTimeline stops={stops} />
          </div>
        )}

        <p className="text-center text-[10px] text-gray-300 pt-1">
          Auto-refreshes every 30 seconds
        </p>
      </div>
    </div>
  );
}
