"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Delivery } from "@/types/delivery";
import Link from "next/link";

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

interface BoardData {
  deliveries: Delivery[];
  stats: Stats;
}

const REFRESH_INTERVAL = 30_000;
const COMPLETED_HIDE_MINS = 30;

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  "Pending":     { label: "SCHEDULED", color: "text-amber-400"   },
  "In Progress": { label: "EN ROUTE",  color: "text-sky-400"     },
  "Completed":   { label: "DELIVERED", color: "text-emerald-400" },
};

const PRIORITY_COLOR: Record<string, string> = {
  Urgent:  "text-red-400",
  Express: "text-orange-400",
  Normal:  "text-zinc-500",
};

/** Returns true if a completed delivery should still be shown (within 30 min window) */
function shouldShow(d: Delivery, now: Date): boolean {
  if (d.status !== "Completed") return true;
  if (!d.deliveryTime) return false; // no time recorded — hide

  // deliveryTime is "HH:MM", combine with today's date
  const [h, m] = d.deliveryTime.split(":").map(Number);
  const completedAt = new Date(now);
  completedAt.setHours(h, m, 0, 0);

  const diffMins = (now.getTime() - completedAt.getTime()) / 60000;
  return diffMins <= COMPLETED_HIDE_MINS;
}

function fmt12(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function FlipCell({ value, className }: { value: string; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== display) {
      setFlipping(true);
      const t = setTimeout(() => { setDisplay(value); setFlipping(false); }, 300);
      return () => clearTimeout(t);
    }
  }, [value, display]);

  return (
    <span className={cn("inline-block transition-all duration-300", flipping && "opacity-0 scale-y-0", className)}>
      {display}
    </span>
  );
}

export function LiveBoard({ initial }: { initial: BoardData }) {
  const [data, setData] = useState<BoardData>(initial);
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/board", { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
        setCountdown(REFRESH_INTERVAL / 1000);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh data
  useEffect(() => {
    const t = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(t);
  }, [refresh]);

  // Tick every second for clock + 30-min hide window
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const { deliveries, stats } = data;

  const inProgress = deliveries.filter((d) => d.status === "In Progress");
  const pending    = deliveries.filter((d) => d.status === "Pending");
  const completed  = deliveries.filter((d) => d.status === "Completed" && shouldShow(d, now));
  const sorted     = [...inProgress, ...pending, ...completed];

  const tickerItems = [...inProgress, ...pending, ...deliveries.filter((d) => d.status === "Completed")];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono">

      {/* Ticker */}
      <div className="bg-zinc-900 border-b border-zinc-800 overflow-hidden h-10 flex items-center">
        <div className="shrink-0 bg-amber-500 text-black text-xs font-bold px-4 h-full flex items-center tracking-widest">
          LIVE
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap animate-[ticker_40s_linear_infinite] text-sm text-zinc-400 tracking-wider">
            {[0, 1].map((copy) => (
              <span key={copy} className="flex shrink-0 px-8">
                {tickerItems.map((d) => (
                  <span key={d.id} className="mr-16">
                    <span className="text-white font-bold">{d.deliveryId}</span>
                    {" · "}
                    <span>{d.customerName}</span>
                    {" · "}
                    <span className={STATUS_DISPLAY[d.status]?.color ?? "text-zinc-400"}>
                      {STATUS_DISPLAY[d.status]?.label ?? d.status}
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/60">
        <div className="max-w-[1600px] mx-auto px-8 py-4 flex items-center gap-10">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 tracking-widest uppercase">Total</span>
            <span className="text-3xl font-bold tabular-nums text-white">{stats.total}</span>
          </div>
          <div className="w-px h-7 bg-zinc-700" />
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-xs text-zinc-500 tracking-widest uppercase">En Route</span>
            <span className="text-3xl font-bold tabular-nums text-sky-400">{stats.inProgress}</span>
          </div>
          <div className="w-px h-7 bg-zinc-700" />
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs text-zinc-500 tracking-widest uppercase">Scheduled</span>
            <span className="text-3xl font-bold tabular-nums text-amber-400">{stats.pending}</span>
          </div>
          <div className="w-px h-7 bg-zinc-700" />
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-zinc-500 tracking-widest uppercase">Delivered</span>
            <span className="text-3xl font-bold tabular-nums text-emerald-400">{stats.completed}</span>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs text-zinc-500 tracking-wider">
            <span>UPDATED {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="border border-zinc-700 rounded px-3 py-1 hover:border-zinc-500 hover:text-zinc-300 transition disabled:opacity-40"
            >
              {refreshing ? "···" : `↻ ${countdown}s`}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-[1600px] mx-auto px-8 pt-8 pb-12">

        {/* Column headers — match admin table */}
        <div className="grid grid-cols-[160px_1fr_1.4fr_180px_120px_110px_110px_90px_160px] gap-6 px-6 pb-3 border-b border-zinc-800 text-xs text-zinc-500 tracking-widest uppercase">
          <span>ID</span>
          <span>Customer</span>
          <span>Dropoff</span>
          <span>Rider</span>
          <span>Date</span>
          <span>Pickup</span>
          <span>Delivered</span>
          <span>Dist.</span>
          <span>Status</span>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 text-zinc-600">
            <span className="text-6xl font-bold tracking-widest mb-4">- - -</span>
            <p className="text-base tracking-widest uppercase">No deliveries scheduled today</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {sorted.map((d, i) => {
              const sc = STATUS_DISPLAY[d.status] ?? STATUS_DISPLAY["Pending"];
              const pc = PRIORITY_COLOR[d.priority] ?? PRIORITY_COLOR.Normal;
              const isActive = d.status === "In Progress";
              return (
                <Link
                  key={d.id}
                  href={`/track/${d.deliveryId}`}
                  className={cn(
                    "grid grid-cols-[160px_1fr_1.4fr_180px_120px_110px_110px_90px_160px] gap-6 px-6 py-5 text-base transition-colors",
                    isActive ? "bg-sky-950/30 hover:bg-sky-950/50" : "hover:bg-zinc-900/50",
                    i % 2 === 0 && !isActive ? "bg-zinc-900/20" : ""
                  )}
                >
                  {/* ID */}
                  <span className="font-bold text-white tracking-widest tabular-nums">
                    <FlipCell value={d.deliveryId} />
                  </span>

                  {/* Customer */}
                  <span className="min-w-0">
                    <span className="block font-semibold text-white truncate">{d.customerName}</span>
                    {d.customerPhone && (
                      <span className="block text-sm text-zinc-500 mt-0.5">{d.customerPhone}</span>
                    )}
                  </span>

                  {/* Dropoff */}
                  <span className="text-zinc-300 truncate leading-tight self-center">{d.dropoffLocation}</span>

                  {/* Rider */}
                  <span className="text-zinc-300 truncate self-center">
                    {d.assignedRiderName ?? <span className="text-zinc-600">UNASSIGNED</span>}
                  </span>

                  {/* Date */}
                  <span className="text-zinc-400 tabular-nums self-center">{d.deliveryDate}</span>

                  {/* Pickup */}
                  <span className="text-zinc-400 tabular-nums self-center">{fmt12(d.pickupTime)}</span>

                  {/* Delivered */}
                  <span className="text-zinc-400 tabular-nums self-center">{fmt12(d.deliveryTime)}</span>

                  {/* Dist. */}
                  <span className={cn("tabular-nums self-center", pc)}>
                    {d.distance != null ? `${d.distance} km` : "—"}
                  </span>

                  {/* Status */}
                  <span className={cn("inline-flex items-center gap-2 font-bold tracking-widest uppercase self-center", sc.color)}>
                    {isActive && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />}
                    <FlipCell value={sc.label} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
