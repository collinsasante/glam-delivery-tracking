"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Navigation, Package, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import type { RiderPerformanceScore, ClockEventRaw } from "@/lib/performance/types";

const RATING_PILL: Record<string, string> = {
  Excellent: "bg-green-100 text-green-800",
  "Very Good": "bg-blue-100 text-blue-800",
  Good: "bg-amber-100 text-amber-800",
  Average: "bg-gray-100 text-gray-700",
  "Below Average": "bg-gray-100 text-gray-500",
  "Needs Improvement": "bg-red-100 text-red-700",
  "No Data": "bg-gray-100 text-gray-400",
};

function fmt12(time: string): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function ScoreBar({ label, value, weight, color }: { label: string; value: number | null; weight: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-semibold text-gray-800 tabular-nums">
          {value !== null ? value : "N/A"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100">
        {value !== null && (
          <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
        )}
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5">{weight}</p>
    </div>
  );
}

function StatChip({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      <div>
        <p className="text-[10px] text-gray-400">{label}</p>
        <p className="text-xs font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

interface Props {
  score: RiderPerformanceScore | null;
  open: boolean;
  onClose: () => void;
}

export function PerformanceDetailPanel({ score, open, onClose }: Props) {
  if (!score) return null;

  const { rider, stats, clockEvents, dailyBreakdown } = score;

  // Group clock events by date for the attendance section
  const clockByDate = new Map<string, ClockEventRaw[]>();
  for (const e of clockEvents) {
    const arr = clockByDate.get(e.date) ?? [];
    arr.push(e);
    clockByDate.set(e.date, arr);
  }

  // Only show daily breakdown days that had activity (stops or clock events)
  const activeDays = dailyBreakdown.filter(
    (d) => d.assignedStops > 0 || d.clockedIn
  );

  const maxStops = Math.max(...dailyBreakdown.map((d) => d.assignedStops), 1);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-lg w-full max-h-[90vh] overflow-y-auto"
        showCloseButton
      >
        <DialogHeader>
          {/* Rider identity */}
          <div className="flex items-center gap-3 pr-6">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-800 font-bold text-base shrink-0 overflow-hidden">
              {rider.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={rider.photoUrl} alt={rider.name} className="w-10 h-10 object-cover" />
              ) : (
                rider.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-gray-900">{rider.name}</DialogTitle>
              <p className="text-[11px] text-gray-400 font-mono">{rider.displayId}</p>
            </div>
            <div className="ml-auto shrink-0 text-right">
              <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
                {score.finalScore}
              </p>
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${RATING_PILL[score.rating] ?? RATING_PILL["No Data"]}`}>
                {score.rating}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Score breakdown */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Score Breakdown</p>
            <div className="space-y-3">
              <ScoreBar label="Speed Efficiency" value={score.speedEfficiency} weight="40% weight" color="bg-blue-400" />
              <ScoreBar label="Completion Rate" value={score.completionRate} weight="30% weight" color="bg-green-400" />
              <ScoreBar label="Route Efficiency" value={score.routeEfficiency} weight="20% weight — N/A" color="bg-amber-400" />
              <ScoreBar label="Consistency" value={score.consistency} weight="10% weight" color="bg-red-400" />
            </div>
          </section>

          {/* Key stats */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Stats</p>
            <div className="grid grid-cols-2 gap-2">
              <StatChip icon={Package} label="Assigned Stops" value={String(stats.assignedStops)} />
              <StatChip icon={CheckCircle2} label="Completed Stops" value={String(stats.completedStops)} />
              <StatChip icon={Navigation} label="Total Distance" value={stats.totalDistanceKm > 0 ? `${stats.totalDistanceKm} km` : "—"} />
              <StatChip icon={Clock} label="Total Duration" value={stats.totalDurationMins > 0 ? `${stats.totalDurationMins} min` : "—"} />
              {stats.avgMinutesPerKm !== null && (
                <StatChip icon={TrendingUp} label="Avg min/km" value={`${stats.avgMinutesPerKm}`} />
              )}
              <StatChip icon={Calendar} label="Clock-in Days" value={`${stats.clockInDays} / ${stats.expectedWorkDays}`} />
            </div>
          </section>

          {/* Daily trend (only meaningful for weekly/monthly) */}
          {activeDays.length > 1 && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Daily Trend</p>
              <div className="space-y-1.5">
                {activeDays.map((d) => (
                  <div key={d.date} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-16 shrink-0 tabular-nums">
                      {new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" })}
                    </span>
                    <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden">
                      {d.assignedStops > 0 && (
                        <div
                          className={`h-3 rounded ${d.completedStops === d.assignedStops ? "bg-green-400" : "bg-amber-400"}`}
                          style={{ width: `${(d.completedStops / Math.max(maxStops, 1)) * 100}%` }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 w-12 text-right tabular-nums shrink-0">
                      {d.completedStops}/{d.assignedStops}
                    </span>
                    {d.clockedIn && (
                      <span className="text-[10px] text-green-600 font-medium shrink-0">✓</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Green bar = all stops completed · ✓ = clocked in</p>
            </section>
          )}

          {/* Clock events */}
          {clockEvents.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Attendance Log</p>
              <div className="space-y-1">
                {[...clockByDate.entries()].map(([date, events]) => (
                  <div key={date} className="border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                    <p className="text-[10px] text-gray-400 mb-1">
                      {new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
                    </p>
                    <div className="space-y-0.5 pl-2">
                      {events.map((e, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${e.eventType === "Clock In" ? "text-green-700" : "text-gray-500"}`}>
                            {e.eventType}
                          </span>
                          <span className="font-mono text-xs text-gray-600">{fmt12(e.time)}</span>
                          {e.durationMins != null && e.eventType === "Clock Out" && (
                            <span className="text-[10px] text-gray-400">{e.durationMins} min</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
