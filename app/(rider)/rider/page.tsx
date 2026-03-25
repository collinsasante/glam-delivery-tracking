import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDeliveriesForRider } from "@/services/deliveries";
import { getStopsForDeliveries } from "@/services/stops";
import {
  getLastClockEvent,
  getTodayClockEvents,
  autoClockOutIfNeeded,
} from "@/services/clockEvents";
import { ClockInButton } from "@/components/riders/ClockInButton";
import { ClockInProvider } from "@/components/riders/ClockInContext";
import { DeliveryCard } from "@/components/deliveries/DeliveryCard";
import { Package } from "lucide-react";

export const metadata: Metadata = { title: "My Deliveries" };
export const dynamic = "force-dynamic";

export default async function RiderPage() {
  const session = await auth();
  if (!session) redirect("/signin");

  const riderId = session.user?.id!;

  // Auto clock-out if rider forgot to clock out yesterday
  await autoClockOutIfNeeded(riderId);

  const [deliveries, lastEvent, todayEvents] = await Promise.all([
    getDeliveriesForRider(riderId),
    getLastClockEvent(riderId),
    getTodayClockEvents(riderId),
  ]);
  const clockedIn = lastEvent?.eventType === "Clock In";

  const pending = deliveries.filter((d) => d.status === "Pending");
  const active = deliveries.filter((d) => d.status === "In Progress");
  const completed = deliveries.filter((d) => d.status === "Completed");

  const needsStops = [...active, ...pending];
  const stopsMap = await getStopsForDeliveries(needsStops.map((d) => d.id));

  const activeWithStops = active.map((d) => {
    const stops = stopsMap.get(d.id) ?? [];
    const currentStop =
      stops.find((s) => s.status === "In Progress") ??
      stops.find((s) => s.status === "Pending") ??
      null;
    return { delivery: d, stop: currentStop };
  });

  const pendingWithStops = pending.map((d) => {
    const stops = stopsMap.get(d.id) ?? [];
    return { delivery: d, stop: stops[0] ?? null };
  });

  const clockInTimestamp =
    clockedIn && lastEvent?.eventType === "Clock In"
      ? lastEvent.timestamp
      : undefined;

  const hasClockInToday = todayEvents.some((e) => e.eventType === "Clock In");

  const clockHistory = todayEvents.map((e) => ({
    type: e.eventType,
    time: e.time,
  }));

  return (
    <ClockInProvider initialClockedIn={clockedIn}>
    <div className="space-y-4">
      {/* Shift status */}
      <ClockInButton
        initialClockedIn={clockedIn}
        clockInTimestamp={clockInTimestamp}
        hasClockInToday={hasClockInToday}
      />

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "Pending",
            value: pending.length,
            dot: "bg-amber-400",
            text: "text-amber-700",
            bg: "bg-amber-50",
          },
          {
            label: "Active",
            value: active.length,
            dot: "bg-blue-400",
            text: "text-blue-700",
            bg: "bg-blue-50",
          },
          {
            label: "Done",
            value: completed.length,
            dot: "bg-green-400",
            text: "text-green-700",
            bg: "bg-green-50",
          },
        ].map(({ label, value, dot, text, bg }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center"
          >
            <p className={`text-2xl font-bold tabular-nums ${text}`}>{value}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <p className="text-[10px] font-medium text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active delivery — most prominent */}
      {activeWithStops.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-900">
              Active delivery
            </h2>
          </div>
          {activeWithStops.map(({ delivery, stop }) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              stop={stop ?? undefined}
              isClockedIn={clockedIn}
              variant="active"
            />
          ))}
        </section>
      )}

      {/* Pending deliveries */}
      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Pending{" "}
            <span className="font-normal text-gray-400">({pending.length})</span>
          </h2>
          {!clockedIn && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              Clock in to start accepting deliveries
            </div>
          )}
          {pendingWithStops.map(({ delivery, stop }) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              stop={stop ?? undefined}
              isClockedIn={clockedIn}
              variant="pending"
            />
          ))}
        </section>
      )}

      {/* Completed today */}
      {completed.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Completed today{" "}
            <span className="font-normal text-gray-400">({completed.length})</span>
          </h2>
          {completed.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              isClockedIn={clockedIn}
              variant="completed"
            />
          ))}
        </section>
      )}

      {/* Empty state */}
      {deliveries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No deliveries assigned</p>
          <p className="text-xs text-gray-400 mt-1">
            Your deliveries will appear here
          </p>
        </div>
      )}

      {/* Shift history */}
      {clockHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Today&apos;s shifts
          </p>
          <div className="space-y-1.5">
            {clockHistory.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-0.5">
                <span className="text-sm text-gray-600">{e.type}</span>
                <span className="font-mono text-xs text-gray-400">{e.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </ClockInProvider>
  );
}
