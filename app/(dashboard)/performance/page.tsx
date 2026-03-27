export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPerformanceData } from "@/lib/performance/getPerformanceData";
import { computeFleetScores } from "@/lib/performance/calculatePerformance";
import { getDateRange, formatPeriodLabel } from "@/lib/performance/dateUtils";
import { PerformanceSummaryCards } from "@/components/performance/PerformanceSummaryCards";
import { PerformanceTable } from "@/components/performance/PerformanceTable";
import type { Period } from "@/lib/performance/types";

export const metadata: Metadata = { title: "Performance" };

const PERIODS: Period[] = ["daily", "weekly", "monthly"];

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function PerformancePage({ searchParams }: Props) {
  const params = await searchParams;
  const period = (PERIODS.includes(params.period as Period) ? params.period : "daily") as Period;
  const range = getDateRange(period);

  const rawData = await getPerformanceData(range);
  const { scores, summary } = computeFleetScores(rawData, range);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Performance</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {formatPeriodLabel(period)} · {range.start}{period !== "daily" ? ` → ${range.end}` : ""}
          </p>
        </div>

        {/* Period tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg shrink-0">
          {PERIODS.map((p) => (
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
              {formatPeriodLabel(p)}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <PerformanceSummaryCards summary={summary} period={formatPeriodLabel(period)} />

      {/* Ranking table */}
      {scores.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 px-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3 mx-auto">
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No active riders</p>
          <p className="text-xs text-gray-400 mt-1">Add riders with the Rider role to see rankings</p>
        </div>
      ) : (
        <PerformanceTable scores={scores} />
      )}
    </div>
  );
}
