import { CheckCircle2 } from "lucide-react";
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
          <div key={stop.id} className="flex gap-3.5">
            {/* Icon + connector line */}
            <div className="flex flex-col items-center shrink-0">
              {isCompleted ? (
                <div className="w-[26px] h-[26px] rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-[13px] w-[13px] text-white" strokeWidth={3} />
                </div>
              ) : isActive ? (
                <div className="w-[26px] h-[26px] rounded-full bg-white border-[2.5px] border-blue-500 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
              ) : (
                <div className="w-[26px] h-[26px] rounded-full bg-gray-100 border-2 border-gray-200 shrink-0" />
              )}
              {!isLast && (
                <div
                  className={cn(
                    "w-[2px] flex-1 my-1 min-h-[28px] rounded-full",
                    isCompleted ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-[22px] min-w-0 flex-1">
              <p
                className={cn(
                  "text-[13.5px] font-bold leading-tight",
                  isCompleted
                    ? "text-gray-900"
                    : isActive
                    ? "text-gray-900"
                    : "text-gray-400"
                )}
              >
                {stop.toLocation || stop.dropoffLocation}
              </p>
              {isCompleted && stop.arrivedAt && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(stop.arrivedAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {isCompleted && stop.riderGps && (
                <a
                  href={`https://maps.google.com/?q=${stop.riderGps.lat},${stop.riderGps.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline mt-0.5 inline-block"
                >
                  View drop point →
                </a>
              )}
              {isActive && (
                <p className="text-xs text-blue-600 mt-0.5 font-semibold">
                  Rider en route
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
