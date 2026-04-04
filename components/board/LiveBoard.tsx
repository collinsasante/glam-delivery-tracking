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

const STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  "Pending":     { label: "SCHEDULED", color: "text-amber-400",  bg: "bg-amber-400/10" },
  "In Progress": { label: "EN ROUTE",  color: "text-sky-400",    bg: "bg-sky-400/10"   },
  "Completed":   { label: "DELIVERED", color: "text-emerald-400", bg: "bg-emerald-400/10" },
};

const PRIORITY_COLOR: Record<string, string> = {
  Urgent:  "text-red-400",
  Express: "text-orange-400",
  Normal:  "text-zinc-500",
};


function FlipCell({ value, className }: { value: string; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== display) {
      setFlipping(true);
      const t = setTimeout(() => {
        setDisplay(value);
        setFlipping(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [value, display]);

  return (
    <span
      className={cn(
        "inline-block transition-all duration-300",
        flipping && "opacity-0 scale-y-0",
        className
      )}
    >
      {display}
    </span>
  );
}

export function LiveBoard({ initial }: { initial: BoardData }) {
  const [data, setData] = useState<BoardData>(initial);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/board", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date());
        setCountdown(REFRESH_INTERVAL / 1000);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const { deliveries, stats } = data;

  const inProgress = deliveries.filter((d) => d.status === "In Progress");
  const pending    = deliveries.filter((d) => d.status === "Pending");
  const completed  = deliveries.filter((d) => d.status === "Completed");
  const sorted     = [...inProgress, ...pending, ...completed];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono">

      {/* Ticker bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 overflow-hidden h-8 flex items-center">
        <div className="shrink-0 bg-amber-500 text-black text-[10px] font-bold px-3 h-full flex items-center tracking-widest">
          LIVE
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap animate-[ticker_40s_linear_infinite] text-[11px] text-zinc-400 tracking-wider">
            {[0, 1].map((copy) => (
              <span key={copy} className="flex shrink-0 px-6">
                {sorted.map((d) => (
                  <span key={d.id} className="mr-12">
                    <span className="text-white">{d.deliveryId}</span>
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

      {/* Stats row */}
      <div className="border-b border-zinc-800 bg-zinc-900/60">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Total</span>
            <span className="text-xl font-bold tabular-nums text-white">{stats.total}</span>
          </div>
          <div className="w-px h-5 bg-zinc-700" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[10px] text-zinc-500 tracking-widest uppercase">En Route</span>
            <span className="text-xl font-bold tabular-nums text-sky-400">{stats.inProgress}</span>
          </div>
          <div className="w-px h-5 bg-zinc-700" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Scheduled</span>
            <span className="text-xl font-bold tabular-nums text-amber-400">{stats.pending}</span>
          </div>
          <div className="w-px h-5 bg-zinc-700" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-zinc-500 tracking-widest uppercase">Delivered</span>
            <span className="text-xl font-bold tabular-nums text-emerald-400">{stats.completed}</span>
          </div>
          <div className="ml-auto flex items-center gap-3 text-[10px] text-zinc-500 tracking-wider">
            <span>UPDATED {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="border border-zinc-700 rounded px-2 py-0.5 hover:border-zinc-500 hover:text-zinc-300 transition disabled:opacity-40"
            >
              {refreshing ? "···" : `↻ ${countdown}s`}
            </button>
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-[120px_1fr_180px_140px_120px_120px] gap-4 px-4 pb-2 border-b border-zinc-800 text-[10px] text-zinc-500 tracking-widest uppercase">
          <span>Flight</span>
          <span>Destination</span>
          <span>Rider</span>
          <span>Origin</span>
          <span>Priority</span>
          <span>Status</span>
        </div>
      </div>

      {/* Rows */}
      <div className="max-w-7xl mx-auto px-6 pb-10">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-600">
            <span className="text-5xl font-bold tracking-widest mb-4">- - -</span>
            <p className="text-sm tracking-widest uppercase">No flights scheduled today</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {sorted.map((d, i) => {
              const sc = STATUS_DISPLAY[d.status] ?? STATUS_DISPLAY["Pending"];
              const pc = PRIORITY_COLOR[d.priority] ?? PRIORITY_COLOR.Normal;
              const isActive = d.status === "In Progress";
              return (
                <Link
                  key={d.id}
                  href={`/track/${d.deliveryId}`}
                  className={cn(
                    "grid grid-cols-[120px_1fr_180px_140px_120px_120px] gap-4 px-4 py-3.5 text-sm transition-colors",
                    isActive
                      ? "bg-sky-950/30 hover:bg-sky-950/50"
                      : "hover:bg-zinc-900/60",
                    i % 2 === 0 && !isActive ? "bg-zinc-900/20" : ""
                  )}
                >
                  {/* Flight number */}
                  <span className="font-bold text-white tracking-widest text-xs tabular-nums">
                    <FlipCell value={d.deliveryId} />
                  </span>

                  {/* Destination */}
                  <span className="text-zinc-200 truncate text-xs leading-tight">
                    <span className="block font-semibold truncate">{d.customerName}</span>
                    <span className="text-zinc-500 text-[10px] truncate">{d.dropoffLocation}</span>
                  </span>

                  {/* Rider */}
                  <span className="text-zinc-300 text-xs truncate">
                    {d.assignedRiderName ?? <span className="text-zinc-600">UNASSIGNED</span>}
                  </span>

                  {/* Origin / warehouse */}
                  <span className="text-zinc-400 text-xs truncate uppercase tracking-wide">
                    {d.warehouse}
                  </span>

                  {/* Priority */}
                  <span className={cn("text-xs font-semibold tracking-wider uppercase", pc)}>
                    {d.priority}
                  </span>

                  {/* Status */}
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase", sc.color)}>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />}
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
