import { CheckCircle2, Circle, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeliveryStop } from "@/types/stop";

interface Props {
  stops: DeliveryStop[];
}

export function TrackingTimeline({ stops }: Props) {
  return (
    <div className="space-y-0">
      {stops.map((stop, i) => {
        const isCompleted = stop.status === "Completed";
        const isActive = stop.status === "In Progress";
        const isLast = i === stops.length - 1;

        return (
          <div key={stop.id} className="flex gap-4">
            {/* Icon + connector line */}
            <div className="flex flex-col items-center shrink-0">
              <div className="mt-0.5 relative">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : isActive ? (
                  <div className="relative">
                    <Truck className="h-5 w-5 text-blue-500" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  </div>
                ) : (
                  <Circle className="h-5 w-5 text-gray-200" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-px flex-1 mt-1.5 mb-1 min-h-[28px]",
                    isCompleted ? "bg-green-200" : "bg-gray-100"
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-5 min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium leading-tight",
                  isCompleted
                    ? "text-green-700"
                    : isActive
                    ? "text-blue-700"
                    : "text-gray-400"
                )}
              >
                {stop.dropoffLocation}
              </p>
              {isCompleted && stop.arrivedAt && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Delivered at{" "}
                  {new Date(stop.arrivedAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {isActive && (
                <p className="text-xs text-blue-500 mt-0.5 font-medium">
                  On the way…
                </p>
              )}
              {stop.distanceKm != null && (
                <p className="text-xs text-gray-300 mt-0.5">
                  {stop.distanceKm} km
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
