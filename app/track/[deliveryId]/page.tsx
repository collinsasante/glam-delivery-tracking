
import { notFound } from "next/navigation";
import Image from "next/image";
import { getDeliveryByCode } from "@/services/deliveries";
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
  const delivery = await getDeliveryByCode(deliveryId);
  return {
    title: delivery ? `Tracking · ${delivery.orderId}` : "Delivery Not Found",
  };
}

const statusConfig = {
  Pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-800",
    label: "Pending",
  },
  "In Progress": {
    dot: "bg-blue-400",
    pill: "bg-blue-50 text-blue-800",
    label: "In Progress",
  },
  Completed: {
    dot: "bg-green-400",
    pill: "bg-green-50 text-green-800",
    label: "Delivered",
  },
  "On Hold": {
    dot: "bg-orange-400",
    pill: "bg-orange-50 text-orange-800",
    label: "On Hold",
  },
};

const CARD = "bg-white rounded-[20px] border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_26px_-18px_rgba(16,24,32,0.22)]";

export default async function TrackingPage({ params }: Props) {
  const { deliveryId } = await params;
  const delivery = await getDeliveryByCode(deliveryId).catch(() => null);

  if (!delivery) notFound();

  const stops = await getStopsForDelivery(delivery.id);

  const sc = statusConfig[delivery.status] ?? statusConfig["Pending"];

  const completedStops = stops.filter((s) => s.status === "Completed").length;
  const progressPct =
    stops.length > 0 ? Math.round((completedStops / stops.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f6f6f8]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-lg mx-auto px-5 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[8px] bg-red-800 flex items-center justify-center shrink-0">
              <Image src="/logo.png" alt="" width={14} height={14} className="rounded-[3px]" />
            </div>
            <span className="font-bold text-gray-900 text-sm">
              Drop
            </span>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-[6px] rounded-full text-[11.5px] font-semibold",
              sc.pill
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sc.dot)} />
            {sc.label}
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-4">
        {/* Order summary card */}
        <div className={cn(CARD, "p-[22px]")}>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-gray-300 mb-3">
            Order
          </p>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[19px] font-extrabold tracking-tight text-gray-900 truncate">
                {delivery.customerName}
              </p>
              <p className="text-xs text-gray-400 font-mono mt-1">
                #{delivery.orderId}
              </p>
            </div>
            {delivery.status === "Completed" && (
              <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
            )}
          </div>

          <div className="flex items-start gap-2.5 mt-[18px] pt-4 border-t border-black/[0.055] text-sm text-gray-600">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" strokeWidth={1.8} />
            <span className="leading-snug text-[13.5px]">{delivery.dropoffLocation}</span>
          </div>

          {/* Progress bar — only when there are multiple stops */}
          {stops.length > 1 && (
            <div className="mt-5 pt-[18px] border-t border-black/[0.055]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-300">
                  Progress
                </span>
                <span className="text-[11.5px] font-bold text-gray-900 tabular-nums">
                  {completedStops}/{stops.length} stops
                </span>
              </div>
              <div className="h-[7px] rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Delivery times */}
        {(delivery.pickupTime || delivery.deliveryTime) && (
          <div className={cn(CARD, "p-[22px]")}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-gray-300 mb-3.5">
              Times
            </p>
            <div className="flex gap-6">
              {delivery.pickupTime && (
                <div className="flex items-center gap-2.5">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-[#f6f6f8] flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-gray-500" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[10.5px] text-gray-400 font-semibold">Picked up</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">
                      {delivery.pickupTime}
                    </p>
                  </div>
                </div>
              )}
              {delivery.deliveryTime && (
                <div className="flex items-center gap-2.5">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[10.5px] text-gray-400 font-semibold">Delivered</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">
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
          <div className={cn(CARD, "p-[22px]")}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-gray-300 mb-[18px]">
              Delivery progress
            </p>
            <TrackingTimeline stops={stops} />
          </div>
        )}

        <p className="text-center text-[11px] text-gray-300 pt-1">
          Auto-refreshes every 30 seconds
        </p>
      </div>
    </div>
  );
}
