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
    getDeliveries({}),
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
    <LiveBoard
      initial={{ deliveries: enriched, stats }}
      header={
        <div className="w-full flex items-center justify-between" style={{ padding: "1vw 2vw", height: "clamp(3rem, 6vw, 7rem)" }}>
          <div className="flex items-center" style={{ gap: "1.5vw" }}>
            <Image src="/logo.png" alt="Drop" width={48} height={48} className="rounded-xl shrink-0" style={{ width: "clamp(28px, 4vw, 56px)", height: "clamp(28px, 4vw, 56px)" }} />
            <span className="font-bold text-white font-mono tracking-widest" style={{ fontSize: "clamp(1rem, 2.5vw, 3rem)" }}>DROP</span>
            <span className="text-zinc-600 font-mono tracking-widest" style={{ fontSize: "clamp(0.75rem, 1.5vw, 1.8rem)" }}>DELIVERIES</span>
          </div>
          <div className="flex items-center" style={{ gap: "2vw" }}>
            <span className="inline-flex items-center gap-[0.5vw] rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono tracking-widest" style={{ fontSize: "clamp(0.6rem, 1.2vw, 1.4rem)", padding: "0.4vw 1vw" }}>
              <span className="rounded-full bg-emerald-400 animate-pulse" style={{ width: "0.8vw", height: "0.8vw", minWidth: "6px", minHeight: "6px" }} />
              LIVE
            </span>
            <Clock />
          </div>
        </div>
      }
    />
  );
}
