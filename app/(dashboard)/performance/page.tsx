export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import { getPerformanceData } from "@/lib/performance/getPerformanceData";
import { computeFleetScores } from "@/lib/performance/calculatePerformance";
import { getDateRange, formatPeriodLabel } from "@/lib/performance/dateUtils";
import { PerformanceSummaryCards } from "@/components/performance/PerformanceSummaryCards";
import { PerformanceTable } from "@/components/performance/PerformanceTable";
import { PeriodSelector } from "@/components/performance/PeriodSelector";
import type { Period, RiderRawData } from "@/lib/performance/types";

export const metadata: Metadata = { title: "Performance" };

const PERIODS: Period[] = ["daily", "weekly", "monthly", "yearly", "custom"];

interface Props {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}

export default async function PerformancePage({ searchParams }: Props) {
  const params = await searchParams;
  const period = (PERIODS.includes(params.period as Period) ? params.period : "monthly") as Period;
  const range = getDateRange(period, params.from, params.to);

  let rawData: RiderRawData[] = [];
  try {
    rawData = await getPerformanceData(range);
  } catch (err) {
    console.error("[performance] getPerformanceData failed:", err);
  }
  const { scores, summary } = computeFleetScores(rawData, range);

  const label = formatPeriodLabel(period);
  const rangeLabel =
    period === "daily"
      ? range.start
      : period === "custom"
      ? `${range.start} → ${range.end}`
      : `${range.start} → ${range.end}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900">Performance</h1>
          <p className="text-[13.5px] text-gray-400 mt-1.5">
            {label} · {rangeLabel}
          </p>
        </div>

        <PeriodSelector
          current={period}
          customFrom={params.from}
          customTo={params.to}
        />
      </div>

      {/* Summary cards */}
      <PerformanceSummaryCards summary={summary} period={label} />

      {/* Ranking table */}
      {scores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] py-16 px-4 text-center">
          <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 mx-auto">
            <TrendingUp className="h-5 w-5 text-gray-400" strokeWidth={1.8} />
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
