export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Navigation, Package, CheckCircle2, Calendar } from "lucide-react";
import { getRiderById } from "@/services/riders";
import { getPerformanceData } from "@/lib/performance/getPerformanceData";
import { computeFleetScores } from "@/lib/performance/calculatePerformance";
import { getDateRange, formatPeriodLabel } from "@/lib/performance/dateUtils";
import type { Period } from "@/lib/performance/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rider Performance" };

const RATING_COLORS: Record<string, string> = {
  Excellent: "bg-green-100 text-green-800",
  "Very Good": "bg-blue-100 text-blue-800",
  Good: "bg-amber-100 text-amber-800",
  Average: "bg-gray-100 text-gray-700",
  "Below Average": "bg-gray-100 text-gray-500",
  "Needs Improvement": "bg-red-100 text-red-700",
  "No Data": "bg-gray-100 text-gray-400",
};

const PERIODS: Period[] = ["daily", "weekly", "monthly"];

interface Props {
  params: Promise<{ riderId: string }>;
  searchParams: Promise<{ period?: string }>;
}

function fmt12(time: string): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function MetricBar({ label, value, weight, color }: { label: string; value: number | null; weight: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-sm font-semibold text-gray-900 tabular-nums">
          {value !== null ? value : "N/A"}
        </p>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        {value !== null && (
          <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">{weight}</p>
    </div>
  );
}

export default async function RiderPerformancePage({ params, searchParams }: Props) {
  const { riderId } = await params;
  const sp = await searchParams;
  const period = (PERIODS.includes(sp.period as Period) ? sp.period : "daily") as Period;
  const range = getDateRange(period);

  const rider = await getRiderById(riderId);
  if (!rider) notFound();

  // Fetch all riders' data then extract this rider's score from fleet computation
  // (needed to compute fleet benchmark for speed efficiency)
  const rawData = await getPerformanceData(range);
  const { scores } = computeFleetScores(rawData, range);
  const score = scores.find((s) => s.rider.id === riderId);

  if (!score) {
    // Rider exists but has no data for this period — show a zero state
    return (
      <div className="max-w-2xl space-y-5">
        <Link href="/performance" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" /> Back to performance
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-800 font-bold text-lg shrink-0">
            {rider.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900">{rider.name}</h1>
            <p className="text-sm text-gray-400">{rider.riderId}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-black/[0.045] p-8 text-center">
          <p className="text-sm text-gray-500">No data for {formatPeriodLabel(period).toLowerCase()}</p>
        </div>
      </div>
    );
  }

  const { stats, dailyBreakdown, clockEvents } = score;
  const activeDays = dailyBreakdown.filter((d) => d.assignedStops > 0 || d.clockedIn);
  const maxStops = Math.max(...dailyBreakdown.map((d) => d.assignedStops), 1);

  // Group clock events by date
  const clockByDate = new Map<string, typeof clockEvents>();
  for (const e of clockEvents) {
    const arr = clockByDate.get(e.date) ?? [];
    arr.push(e);
    clockByDate.set(e.date, arr);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/performance" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-3">
          <ChevronLeft className="h-4 w-4" /> Back to performance
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-800 font-bold text-lg shrink-0 overflow-hidden">
              {rider.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={rider.photoUrl} alt={rider.name} className="w-12 h-12 object-cover" />
              ) : rider.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-gray-900">{rider.name}</h1>
              <p className="text-sm text-gray-400 font-mono">{rider.riderId}</p>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/performance/${riderId}?period=${p}`}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  period === p ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                {formatPeriodLabel(p)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Score card */}
      <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">{formatPeriodLabel(period)} score</p>
            <p className="text-5xl font-bold text-gray-900 tabular-nums">{score.finalScore}</p>
          </div>
          <span className={cn("text-sm font-medium px-3 py-1 rounded-full", RATING_COLORS[score.rating] ?? RATING_COLORS["No Data"])}>
            {score.rating}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-5 border-t border-gray-100">
          <MetricBar label="Speed Efficiency" value={score.speedEfficiency} weight="40% weight" color="bg-blue-400" />
          <MetricBar label="Completion Rate" value={score.completionRate} weight="30% weight" color="bg-green-400" />
          <MetricBar label="Route Efficiency" value={score.routeEfficiency} weight="20% weight" color="bg-amber-400" />
          <MetricBar label="Consistency" value={score.consistency} weight="10% weight" color="bg-red-400" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Package, label: "Assigned", value: String(stats.assignedStops) },
          { icon: CheckCircle2, label: "Completed", value: String(stats.completedStops) },
          { icon: Navigation, label: "Distance", value: stats.totalDistanceKm > 0 ? `${stats.totalDistanceKm} km` : "—" },
          { icon: Clock, label: "Duration", value: stats.totalDurationMins > 0 ? `${stats.totalDurationMins} min` : "—" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-[18px] text-center">
            <Icon className="h-4 w-4 text-gray-400 mx-auto mb-1.5" />
            <p className="text-lg font-bold text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      {activeDays.length > 1 && (
        <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-6">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-300 mb-4">Daily Trend</p>
          <div className="space-y-2">
            {activeDays.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20 shrink-0">
                  {new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
                </span>
                <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden">
                  {d.assignedStops > 0 && (
                    <div
                      className={`h-3 rounded ${d.completedStops === d.assignedStops ? "bg-green-400" : d.completedStops > 0 ? "bg-amber-400" : "bg-gray-300"}`}
                      style={{ width: `${(d.completedStops / maxStops) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-xs text-gray-500 w-10 text-right tabular-nums shrink-0">
                  {d.completedStops}/{d.assignedStops}
                </span>
                <div className="w-6 shrink-0">
                  {d.clockedIn && <span className="text-[10px] text-green-600 font-semibold">✓</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">Green = all completed · Amber = partial · ✓ = clocked in</p>
        </div>
      )}

      {/* Attendance log */}
      {clockEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-6">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-300 mb-3">
            Attendance — {formatPeriodLabel(period)}
          </p>
          <div className="space-y-3">
            {[...clockByDate.entries()].map(([date, events]) => (
              <div key={date}>
                <p className="text-[10px] text-gray-400 mb-1">
                  {new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}
                </p>
                <div className="pl-3 border-l-2 border-gray-100 space-y-1">
                  {events.map((e, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${e.eventType === "Clock In" ? "text-green-700" : "text-gray-500"}`}>
                        {e.eventType}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-gray-600">{fmt12(e.time)}</span>
                        {e.durationMins != null && e.eventType === "Clock Out" && (
                          <span className="text-[10px] text-gray-400">{e.durationMins} min shift</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance summary */}
      {stats.expectedWorkDays > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-6">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-300 mb-3">Attendance Summary</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-green-400"
                style={{ width: `${(stats.clockInDays / stats.expectedWorkDays) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 tabular-nums shrink-0">
              {stats.clockInDays}/{stats.expectedWorkDays} days
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Clocked in on {stats.clockInDays} of {stats.expectedWorkDays} assigned day{stats.expectedWorkDays !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}
