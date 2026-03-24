import Image from "next/image";
import { getDeliveries } from "@/services/deliveries";
import { getRiders } from "@/services/riders";
import { LiveBoard } from "@/components/board/LiveBoard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Delivery Board · Glam Delivery",
  description: "Real-time view of today's deliveries",
};

export default async function BoardPage() {
  const [deliveries, riders] = await Promise.all([
    getDeliveries({ date: "today" }),
    getRiders(),
  ]);

  const riderMap = Object.fromEntries(riders.map((r) => [r.id, r.name]));
  const enriched = deliveries.map((d) => ({
    ...d,
    assignedRiderName: d.assignedRiderId ? (riderMap[d.assignedRiderId] ?? null) : null,
  }));

  const stats = {
    total: enriched.length,
    pending: enriched.filter((d) => d.status === "Pending").length,
    inProgress: enriched.filter((d) => d.status === "In Progress").length,
    completed: enriched.filter((d) => d.status === "Completed").length,
  };

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Glam Delivery" width={28} height={28} className="rounded-md shrink-0" />
            <div>
              <span className="font-semibold text-gray-900 text-sm">Glam Delivery</span>
              <span className="ml-2 text-xs text-gray-400">Live Board</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        </div>
      </header>

      <LiveBoard initial={{ deliveries: enriched, stats }} />
    </div>
  );
}
