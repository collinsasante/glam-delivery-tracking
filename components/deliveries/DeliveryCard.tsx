"use client";

import { useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Navigation, Loader2, Package, CheckCircle2, ChevronRight } from "lucide-react";
import { startDeliveryAction, markArrivedAction } from "@/actions/stops";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "sonner";
import type { Delivery } from "@/types/delivery";
import type { DeliveryStop } from "@/types/stop";
import { useClockIn } from "@/components/riders/ClockInContext";

interface Props {
  delivery: Delivery;
  stop?: DeliveryStop;
  isClockedIn: boolean;
  variant: "pending" | "active" | "completed";
}

const priorityConfig = {
  Normal: { label: "Normal", className: "bg-gray-100 text-gray-500" },
  Urgent: { label: "Urgent", className: "bg-red-100 text-red-700" },
  Express: { label: "Express", className: "bg-orange-100 text-orange-700" },
};

export function DeliveryCard({ delivery, stop, isClockedIn: initialClockedIn, variant }: Props) {
  const [isPending, startTransition] = useTransition();
  const { capture } = useGeolocation();
  const { isClockedIn } = useClockIn();

  // Context starts false by default — use OR so a true context value always wins
  const clockedIn = isClockedIn || initialClockedIn;

  function handleStart() {
    if (!clockedIn) {
      toast.error("Please clock in to start your shift before accepting deliveries.");
      return;
    }
    startTransition(async () => {
      // Capture rider GPS to calculate actual distance to dropoff
      const riderGps = await capture();
      const result = await startDeliveryAction(delivery.id, stop?.id ?? null, riderGps ?? undefined);
      if ("error" in result) toast.error(result.error);
      else toast.success("Delivery started");
    });
  }

  function handleArrived() {
    startTransition(async () => {
      const gps = await capture();
      const result = await markArrivedAction(delivery.id, stop?.id ?? null, {
        gps: gps ?? undefined,
        startedAt: stop?.startedAt ?? undefined,
      });
      if ("error" in result) toast.error(result.error);
      else toast.success("Marked as delivered!");
    });
  }

  const priority = priorityConfig[delivery.priority] ?? priorityConfig.Normal;

  return (
    <div
      className={cn(
        "rounded-[18px] border bg-white p-[18px] space-y-3.5 shadow-[0_1px_2px_rgba(16,24,32,0.04),0_12px_24px_-16px_rgba(16,24,32,0.2)]",
        variant === "active"
          ? "border-blue-200 ring-1 ring-blue-100"
          : variant === "completed"
          ? "border-green-100 bg-[#f7fbf8] shadow-none"
          : "border-black/[0.045]"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-[11px] text-gray-400 leading-none">
              {delivery.deliveryId}
            </span>
            {delivery.priority !== "Normal" && (
              <span
                className={cn(
                  "text-[10px] font-bold px-[7px] py-[2px] rounded-[6px]",
                  priority.className
                )}
              >
                {priority.label.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-[15px] font-bold text-gray-900 leading-tight">
            {delivery.customerName}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {variant === "completed" && (
            <div className="w-[26px] h-[26px] rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
          )}
          {variant === "active" && (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-blue-800 bg-blue-50 px-[10px] py-[5px] rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Active
            </span>
          )}
          <Link
            href={`/rider/deliveries/${delivery.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="View delivery details"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <div className="flex items-start gap-2.5 text-[13px] text-gray-600">
          <MapPin className="h-[15px] w-[15px] text-gray-400 mt-0.5 shrink-0" strokeWidth={1.8} />
          <span className="leading-snug">{delivery.dropoffLocation}</span>
        </div>
        {delivery.customerPhone && (
          <div className="flex items-center gap-2.5 text-[13px]">
            <Phone className="h-[15px] w-[15px] text-gray-400 shrink-0" strokeWidth={1.8} />
            <a
              href={`tel:${delivery.customerPhone}`}
              className="text-gray-600 hover:text-red-800 transition-colors"
            >
              {delivery.customerPhone}
            </a>
          </div>
        )}
        {delivery.distance != null && (
          <div className="flex items-center gap-2.5 text-[13px] text-gray-500">
            <Navigation className="h-[15px] w-[15px] text-gray-400 shrink-0" strokeWidth={1.8} />
            <span>{delivery.distance} km</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {variant === "pending" && (
        <Button
          className="w-full gap-2 h-11 rounded-[11px] bg-red-800 hover:bg-red-900 text-white text-[13px] font-semibold shadow-[0_8px_16px_-8px_rgba(153,27,27,0.5)]"
          onClick={handleStart}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Package className="h-4 w-4" />
              Start delivery
            </>
          )}
        </Button>
      )}

      {variant === "active" && (
        <Button
          className="w-full gap-2 h-11 rounded-[11px] bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold shadow-[0_8px_16px_-8px_rgba(22,163,74,0.4)]"
          onClick={handleArrived}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Mark as Delivered
            </>
          )}
        </Button>
      )}
    </div>
  );
}
