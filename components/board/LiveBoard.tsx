"use client";

import { useEffect, useState, useCallback } from "react";
import { MapPin, User, Package, RefreshCw } from "lucide-react";
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

const statusConfig = {
  Pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    row: "border-l-amber-400",
  },
  "In Progress": {
    dot: "bg-blue-400 animate-pulse",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    row: "border-l-blue-400",
  },
  Completed: {
    dot: "bg-green-400",
    pill: "bg-green-50 text-green-700 border-green-200",
    row: "border-l-green-400",
  },
};

const priorityConfig = {
  Urgent: "bg-red-50 text-red-700 border-red-200",
  Express: "bg-orange-50 text-orange-700 border-orange-200",
  Normal: "bg-gray-50 text-gray-500 border-gray-200",
};

const REFRESH_INTERVAL = 30_000;

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

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [refresh]);

  // Countdown display
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const { deliveries, stats } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Today's Deliveries" value={stats.total} color="text-gray-900" />
          <StatCard label="In Progress" value={stats.inProgress} color="text-blue-600" dot="bg-blue-400 animate-pulse" />
          <StatCard label="Pending" value={stats.pending} color="text-amber-600" dot="bg-amber-400" />
          <StatCard label="Completed" value={stats.completed} color="text-green-600" dot="bg-green-400" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {deliveries.length === 0 ? "No deliveries today" : `${deliveries.length} deliveries`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 bg-white transition disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh ({countdown}s)
          </button>
        </div>

        {deliveries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Package className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No deliveries scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.map((d) => {
              const sc = statusConfig[d.status] ?? statusConfig["Pending"];
              const pc = priorityConfig[d.priority as keyof typeof priorityConfig] ?? priorityConfig.Normal;
              return (
                <Link
                  key={d.id}
                  href={`/track/${d.deliveryId}`}
                  className={cn(
                    "block bg-white rounded-xl border border-gray-100 border-l-4 shadow-sm p-4 hover:shadow-md transition group",
                    sc.row
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Top row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-gray-500">
                          {d.deliveryId}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                            sc.pill
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sc.dot)} />
                          {d.status}
                        </span>
                        {d.priority !== "Normal" && (
                          <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border", pc)}>
                            {d.priority}
                          </span>
                        )}
                      </div>

                      {/* Customer */}
                      <p className="text-sm font-semibold text-gray-900 mt-1.5 truncate">
                        {d.customerName}
                        <span className="text-gray-400 font-normal ml-1.5">#{d.orderId}</span>
                      </p>

                      {/* Location + rider */}
                      <div className="flex items-start gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-start gap-1 text-xs text-gray-500">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                          <span className="leading-snug">{d.dropoffLocation}</span>
                        </span>
                        {d.assignedRiderName && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                            {d.assignedRiderName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Warehouse + time */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-[10px] text-gray-400">{d.warehouse}</p>
                      {d.deliveryDate && (
                        <p className="text-xs text-gray-500 tabular-nums mt-0.5">{d.deliveryDate}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  dot,
}: {
  label: string;
  value: number;
  color: string;
  dot?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {dot && <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dot)} />}
      <div>
        <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
