import Image from "next/image";
import { getDeliveries } from "@/services/deliveries";
import { getRiders } from "@/services/riders";
import { LiveBoard } from "@/components/board/LiveBoard";
import { Clock } from "@/components/board/Clock";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Delivery Board · Drop",
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
    <div className="bg-zinc-950 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Drop" width={28} height={28} className="rounded-md shrink-0" />
            <div className="flex items-center gap-3">
              <span className="font-bold text-white font-mono tracking-widest text-sm">DROP</span>
              <span className="text-zinc-600 text-xs font-mono tracking-widest">DEPARTURES</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
            <Clock />
          </div>
        </div>
      </header>

      <LiveBoard initial={{ deliveries: enriched, stats }} />
    </div>
  );
}
