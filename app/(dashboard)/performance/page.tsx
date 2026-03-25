export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getRiders } from "@/services/riders";
import { getDeliveries } from "@/services/deliveries";
import { getStopsForDelivery } from "@/services/stops";
import { calculatePerformanceScore } from "@/lib/performance";
import { cn } from "@/lib/utils";
import { TrendingUp, Users } from "lucide-react";

export const metadata: Metadata = { title: "Performance" };
export const revalidate = 300;

type Period = "daily" | "weekly" | "monthly";

interface Props {
  searchParams: Promise<{ period?: string }>;
}

const ratingConfig: Record<string, { dot: string; pill: string }> = {
  Excellent:          { dot: "bg-green-500",  pill: "bg-green-50 text-green-700 border-green-200" },
  "Very Good":        { dot: "bg-blue-400",   pill: "bg-blue-50 text-blue-700 border-blue-200" },
  Good:               { dot: "bg-amber-400",  pill: "bg-amber-50 text-amber-700 border-amber-200" },
  Average:            { dot: "bg-gray-400",   pill: "bg-gray-50 text-gray-600 border-gray-200" },
  "Below Average":    { dot: "bg-gray-300",   pill: "bg-gray-50 text-gray-500 border-gray-200" },
  "Needs Improvement":{ dot: "bg-red-400",    pill: "bg-red-50 text-red-600 border-red-200" },
  "No Data":          { dot: "bg-gray-200",   pill: "bg-gray-50 text-gray-400 border-gray-100" },
};

const periodLabels: Record<Period, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
};

export default async function PerformancePage({ searchParams }: Props) {
  const params = await searchParams;
  const period = (params.period ?? "daily") as Period;
  const [riders, deliveries] = await Promise.all([
    getRiders(),
    getDeliveries({ status: "Completed" }),
  ]);

  const riderScores = await Promise.all(
    riders
      .filter((r) => r.role === "Rider" && r.active)
      .map(async (rider) => {
        const riderDeliveries = deliveries.filter(
          (d) => d.assignedRiderId === rider.id
        );
        const allStops = (
          await Promise.all(riderDeliveries.map((d) => getStopsForDelivery(d.id)))
        ).flat();
        const score = calculatePerformanceScore(allStops, period, riderDeliveries.length);
        return { rider, score };
      })
  );

  riderScores.sort((a, b) => b.score.overallScore - a.score.overallScore);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Performance</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {periodLabels[period]} · {riderScores.length} riders
          </p>
        </div>
        {/* Period toggles */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg shrink-0">
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <Link
              key={p}
              href={`/performance?period=${p}`}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                period === p
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Link>
          ))}
        </div>
      </div>

      {riderScores.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 px-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3 mx-auto">
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No performance data</p>
          <p className="text-xs text-gray-400 mt-1">
            Completed deliveries will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {riderScores.map(({ rider, score }, rank) => {
            const rc = ratingConfig[score.rating] ?? ratingConfig["No Data"];
            return (
              <Link
                key={rider.id}
                href={`/performance/${rider.id}?period=${period}`}
                className="block"
              >
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer">
                  {/* Top row: rank + name + score */}
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        rank === 0
                          ? "bg-amber-100 text-amber-700"
                          : rank === 1
                          ? "bg-gray-100 text-gray-600"
                          : rank === 2
                          ? "bg-orange-50 text-orange-600"
                          : "bg-gray-50 text-gray-500"
                      )}
                    >
                      {rank + 1}
                    </div>

                    {/* Avatar + name */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-800 font-semibold text-sm shrink-0">
                        {rider.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {rider.name}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono">
                          {rider.riderId}
                        </p>
                      </div>
                    </div>

                    {/* Score + rating */}
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
                        {score.overallScore}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-medium mt-1",
                          rc.pill.replace("border", "").trim()
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full shrink-0", rc.dot)} />
                        {score.rating}
                      </span>
                    </div>
                  </div>

                  {/* Metrics bar */}
                  {score.totalDeliveries > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-50">
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: "Speed", value: score.metrics.speedEfficiency, color: "bg-blue-400" },
                          { label: "Completion", value: score.metrics.completionRate, color: "bg-green-400" },
                          { label: "Distance", value: score.metrics.distanceScore, color: "bg-amber-400" },
                          { label: "Consistency", value: score.metrics.consistency, color: "bg-red-400" },
                        ].map(({ label, value, color }) => (
                          <div key={label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-400">{label}</span>
                              <span className="text-[10px] font-semibold text-gray-700 tabular-nums">
                                {value}
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-gray-100">
                              <div
                                className={cn("h-1 rounded-full transition-all", color)}
                                style={{ width: `${value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">
                        {score.completedDeliveries}/{score.totalDeliveries} deliveries ·{" "}
                        {score.totalDistanceKm} km
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
