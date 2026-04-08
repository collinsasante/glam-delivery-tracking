"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
const PAGE_SIZE = 8;
const PAGE_INTERVAL = 15_000;
const FADE_MS = 350;

const STATUS_DISPLAY: Record<string, { label: string; dot: string; pill: string; color: string }> = {
  "Pending":     { label: "Pending",     dot: "bg-amber-400",              pill: "bg-amber-400/15 text-amber-300 border border-amber-500/40",      color: "text-amber-400"   },
  "In Progress": { label: "In Progress", dot: "bg-blue-400 animate-pulse", pill: "bg-blue-400/15 text-blue-300 border border-blue-500/40",         color: "text-blue-400"    },
  "Completed":   { label: "Completed",   dot: "bg-emerald-400",            pill: "bg-emerald-400/15 text-emerald-300 border border-emerald-500/40", color: "text-emerald-400" },
};

function shouldShow(d: Delivery, now: Date): boolean {
  if (d.status !== "Completed") return true;
  if (!d.deliveryTime) return true; // no time recorded — keep showing it
  const [h, m] = d.deliveryTime.split(":").map(Number);
  const completedAt = new Date(now);
  completedAt.setHours(h, m, 0, 0);
  return (now.getTime() - completedAt.getTime()) / 60000 <= COMPLETED_HIDE_MINS;
}

function fmt12(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function FlipCell({ value }: { value: string }) {
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
    <span className={cn("inline-block transition-all duration-300", flipping && "opacity-0 scale-y-0")}>
      {display}
    </span>
  );
}

export function LiveBoard({ initial }: { initial: BoardData }) {
  const [data, setData] = useState<BoardData>(initial);
  const [now, setNow] = useState<Date | null>(null); // null until mounted — avoids hydration mismatch
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/board", { cache: "no-store" });
      if (res.ok) { setData(await res.json()); setCountdown(REFRESH_INTERVAL / 1000); }
    } finally { setRefreshing(false); }
  }, []);

  useEffect(() => { const t = setInterval(refresh, REFRESH_INTERVAL); return () => clearInterval(t); }, [refresh]);
  // Initialise clock on mount, then tick every second
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => {
      setNow(new Date());
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const { deliveries, stats } = data;
  const inProgress  = deliveries.filter((d) => d.status === "In Progress");
  const pending     = deliveries.filter((d) => d.status === "Pending");
  // Before mount (now === null) show all completed; after mount apply the 30-min rule
  const completed   = deliveries.filter((d) => d.status === "Completed" && (now === null || shouldShow(d, now)));
  const sorted      = [...inProgress, ...pending, ...completed];
  const totalPages  = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  // Advance page with fade-out → swap → fade-in
  useEffect(() => {
    if (totalPages <= 1) return;
    const t = setInterval(() => {
      setVisible(false);
      fadeTimer.current = setTimeout(() => {
        setPage((p) => (p + 1) % totalPages);
        setVisible(true);
      }, FADE_MS);
    }, PAGE_INTERVAL);
    return () => {
      clearInterval(t);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [totalPages]);

  // Reset to page 0 on data refresh
  useEffect(() => { setPage(0); setVisible(true); }, [deliveries.length]);

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const tickerItems = [...inProgress, ...pending, ...deliveries.filter((d) => d.status === "Completed")];

  // fluid font sizes — scales from laptop to big TV
  const s = {
    ticker:  "clamp(0.75rem, 1.5vw, 1.5rem)",
    label:   "clamp(0.6rem,  1vw,   1rem)",
    stat:    "clamp(2rem,    5vw,   6rem)",
    colHead: "clamp(0.55rem, 0.9vw, 0.95rem)",
    row:     "clamp(0.75rem, 1.4vw, 1.6rem)",
    pill:    "clamp(0.65rem, 1.1vw, 1.2rem)",
  };

  return (
    <div className="h-screen bg-zinc-950 text-white font-mono flex flex-col overflow-hidden">

      {/* Ticker */}
      <div className="bg-zinc-900 border-b border-zinc-800 overflow-hidden flex items-center shrink-0" style={{ height: "clamp(2rem, 4vw, 5rem)" }}>
        <div className="shrink-0 bg-amber-500 text-black font-bold h-full flex items-center tracking-widest px-[2vw]" style={{ fontSize: s.ticker }}>
          LIVE
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap animate-[ticker_40s_linear_infinite] text-zinc-400 tracking-wider" style={{ fontSize: s.ticker }}>
            {[0, 1].map((copy) => (
              <span key={copy} className="flex shrink-0 px-[3vw]">
                {tickerItems.map((d) => (
                  <span key={d.id} className="mr-[4vw]">
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
      <div className="border-b border-zinc-800 bg-zinc-900/60 shrink-0">
        <div className="w-full px-[2vw] py-[1.5vw] flex items-center gap-[3vw]">
          {[
            { label: "Total",       value: stats.total,      dot: null,                        numClass: "text-white"         },
            { label: "In Progress", value: stats.inProgress, dot: "bg-blue-400 animate-pulse", numClass: "text-blue-400"      },
            { label: "Pending",     value: stats.pending,    dot: "bg-amber-400",              numClass: "text-amber-400"     },
            { label: "Completed",   value: stats.completed,  dot: "bg-emerald-400",            numClass: "text-emerald-400"   },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-[1vw]">
              {i > 0 && <div className="w-px bg-zinc-700 self-stretch mx-[1vw]" />}
              {item.dot && <span className={cn("rounded-full shrink-0", item.dot)} style={{ width: "clamp(8px, 1vw, 16px)", height: "clamp(8px, 1vw, 16px)" }} />}
              <span className="text-zinc-500 tracking-widest uppercase" style={{ fontSize: s.label }}>{item.label}</span>
              <span className={cn("font-bold tabular-nums leading-none", item.numClass)} style={{ fontSize: s.stat }}>{item.value}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-[2vw] text-zinc-500 tracking-wider" style={{ fontSize: s.label }}>
            {totalPages > 1 && (
              <span className="text-zinc-400 tabular-nums">
                {page + 1} / {totalPages}
              </span>
            )}
            <span>UPDATED {now ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "--:--:--"}</span>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="border border-zinc-700 rounded hover:border-zinc-500 hover:text-zinc-300 transition disabled:opacity-40 px-[1vw] py-[0.4vw]"
            >
              {refreshing ? "···" : `↻ ${countdown}s`}
            </button>
          </div>
        </div>
      </div>

      {/* Table — flex-1 fills remaining height, no scroll */}
      <div className="flex-1 min-h-0 w-full px-[2vw] pt-[1.5vw] pb-[1vw] flex flex-col overflow-hidden">
        {/* Column headers */}
        <div
          className="grid w-full gap-x-[1vw] px-[1vw] pb-[0.8vw] mb-[0.5vw] border-b border-zinc-800 text-zinc-500 tracking-widest uppercase shrink-0"
          style={{
            gridTemplateColumns: "18fr 22fr 18fr 14fr 14fr 16fr",
            fontSize: s.colHead,
          }}
        >
          <span>Customer</span>
          <span>Dropoff</span>
          <span>Rider</span>
          <span>Pickup</span>
          <span>Delivered</span>
          <span>Status</span>
        </div>

        {/* Rows — fade between pages, never scroll */}
        <div
          className="flex-1 min-h-0 overflow-hidden transition-opacity"
          style={{
            opacity: visible ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
          }}
        >
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600">
              <span className="font-bold tracking-widest mb-[2vw]" style={{ fontSize: "clamp(2rem, 8vw, 10rem)" }}>- - -</span>
              <p className="tracking-widest uppercase" style={{ fontSize: "clamp(0.8rem, 2vw, 2rem)" }}>No deliveries</p>
            </div>
          ) : (
            <div className="h-full flex flex-col divide-y divide-zinc-800/50">
              {paginated.map((d, i) => {
                const sc = STATUS_DISPLAY[d.status] ?? STATUS_DISPLAY["Pending"];
                const isActive = d.status === "In Progress";
                return (
                  <Link
                    key={d.id}
                    href={`/track/${d.deliveryId}`}
                    className={cn(
                      "grid w-full gap-x-[1vw] px-[1vw] transition-colors items-center flex-1",
                      isActive ? "bg-sky-950/30 hover:bg-sky-950/50" : "hover:bg-zinc-900/50",
                      i % 2 === 0 && !isActive ? "bg-zinc-900/20" : ""
                    )}
                    style={{
                      gridTemplateColumns: "18fr 22fr 18fr 14fr 14fr 16fr",
                      fontSize: s.row,
                    }}
                  >
                    <span className="font-semibold text-white truncate">{d.customerName}</span>
                    <span className="text-zinc-300 leading-snug">{d.dropoffLocation}</span>
                    <span className="text-zinc-300 truncate">
                      {d.assignedRiderName ?? <span className="text-zinc-600">UNASSIGNED</span>}
                    </span>
                    <span className="text-zinc-400 tabular-nums">{fmt12(d.pickupTime)}</span>
                    <span className="text-zinc-400 tabular-nums">{fmt12(d.deliveryTime)}</span>
                    <span
                      className={cn("inline-flex items-center gap-[0.4vw] rounded-full font-semibold whitespace-nowrap", sc.pill)}
                      style={{ fontSize: s.pill, padding: "0.3vw 0.8vw" }}
                    >
                      <span className={cn("rounded-full shrink-0", sc.dot)} style={{ width: "0.7vw", height: "0.7vw", minWidth: "6px", minHeight: "6px" }} />
                      <FlipCell value={sc.label} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Page dots */}
        {totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-center gap-[0.6vw] pt-[0.8vw]">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  "rounded-full transition-all",
                  i === page ? "bg-zinc-300" : "bg-zinc-700 hover:bg-zinc-500"
                )}
                style={{
                  width: i === page ? "clamp(16px, 2vw, 28px)" : "clamp(6px, 0.8vw, 10px)",
                  height: "clamp(6px, 0.8vw, 10px)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
