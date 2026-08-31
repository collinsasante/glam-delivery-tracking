import { Trophy, TrendingUp, CheckCircle2, Package } from "lucide-react";
import type { FleetSummary } from "@/lib/performance/types";

interface Props {
  summary: FleetSummary;
  period: string;
}

export function PerformanceSummaryCards({ summary, period }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[18px]">
      {/* Top Performer */}
      <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-[18px]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <Trophy className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-400">Top Performer</p>
        </div>
        {summary.topPerformer ? (
          <>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {summary.topPerformer.rider.name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Score: <span className="font-semibold text-gray-700">{summary.topPerformer.finalScore}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400">No data</p>
        )}
      </div>

      {/* Fleet Avg Score */}
      <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-[18px]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-400">Fleet Avg Score</p>
        </div>
        <p className="text-[28px] font-extrabold tracking-tight text-gray-900 tabular-nums">{summary.fleetAvgScore}</p>
        <p className="text-xs text-gray-400 mt-0.5">{summary.totalRiders} active rider{summary.totalRiders !== 1 ? "s" : ""}</p>
      </div>

      {/* Fleet Avg Completion */}
      <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-[18px]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          </div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-400">Avg Completion</p>
        </div>
        <p className="text-[28px] font-extrabold tracking-tight text-gray-900 tabular-nums">{summary.fleetAvgCompletionRate}%</p>
        <p className="text-xs text-gray-400 mt-0.5">of assigned stops</p>
      </div>

      {/* Total Completed */}
      <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] p-[18px]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
            <Package className="h-3.5 w-3.5 text-red-700" />
          </div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-400">Stops Completed</p>
        </div>
        <p className="text-[28px] font-extrabold tracking-tight text-gray-900 tabular-nums">{summary.totalCompletedStops}</p>
        <p className="text-xs text-gray-400 mt-0.5">{period}</p>
      </div>
    </div>
  );
}
