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
        "rounded-xl border bg-white p-4 space-y-3",
        variant === "active"
          ? "border-blue-200 ring-1 ring-blue-100"
          : variant === "completed"
          ? "border-green-100 bg-green-50/30"
          : "border-gray-200"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-mono text-[11px] text-gray-400 leading-none">
              {delivery.deliveryId}
            </span>
            {delivery.priority !== "Normal" && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                  priority.className
                )}
              >
                {priority.label}
              </span>
            )}
          </div>
          <p className="text-[15px] font-semibold text-gray-900 leading-tight">
            {delivery.customerName}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {variant === "completed" && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Done</span>
            </div>
          )}
          {variant === "active" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
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
      <div className="space-y-1.5">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
          <span className="leading-snug">{delivery.dropoffLocation}</span>
        </div>
        {delivery.customerPhone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <a
              href={`tel:${delivery.customerPhone}`}
              className="text-gray-600 hover:text-red-800 transition-colors"
            >
              {delivery.customerPhone}
            </a>
          </div>
        )}
        {delivery.distance != null && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Navigation className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>{delivery.distance} km</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {variant === "pending" && (
        <Button
          className="w-full gap-2 bg-red-800 hover:bg-red-900 text-white"
          size="sm"
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
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
          size="sm"
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
