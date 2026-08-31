"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PerformanceDetailPanel } from "./PerformanceDetailPanel";
import type { RiderPerformanceScore } from "@/lib/performance/types";

const RATING_DOT: Record<string, string> = {
  Excellent: "bg-green-500",
  "Very Good": "bg-blue-400",
  Good: "bg-amber-400",
  Average: "bg-gray-400",
  "Below Average": "bg-gray-300",
  "Needs Improvement": "bg-red-400",
  "No Data": "bg-gray-200",
};

const RATING_TEXT: Record<string, string> = {
  Excellent: "text-green-700",
  "Very Good": "text-blue-700",
  Good: "text-amber-700",
  Average: "text-gray-600",
  "Below Average": "text-gray-500",
  "Needs Improvement": "text-red-600",
  "No Data": "text-gray-400",
};

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 rounded-full bg-gray-100 hidden sm:block">
        <div className="h-1 rounded-full bg-gray-400" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-600">{value}</span>
    </div>
  );
}

interface Props {
  scores: RiderPerformanceScore[];
}

export function PerformanceTable({ scores }: Props) {
  const [selected, setSelected] = useState<RiderPerformanceScore | null>(null);

  if (scores.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] py-16 px-4 text-center">
        <p className="text-sm font-medium text-gray-700">No riders with data</p>
        <p className="text-xs text-gray-400 mt-1">Assign and complete deliveries to see performance scores</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#fafafb] hover:bg-[#fafafb] border-b border-black/[0.05]">
              <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em] pl-[22px] w-8">#</TableHead>
              <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">Rider</TableHead>
              <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">Score</TableHead>
              <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">Speed</TableHead>
              <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">Completion</TableHead>
              <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">Consistency</TableHead>
              <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">Stops</TableHead>
              <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">Distance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.map((s, rank) => (
              <TableRow
                key={s.rider.id}
                className="group hover:bg-[#fafafb] cursor-pointer border-b border-black/[0.045] last:border-0"
                onClick={() => setSelected(s)}
              >
                {/* Rank */}
                <TableCell className="pl-[22px] py-3.5">
                  <span className={`text-xs font-semibold ${rank === 0 ? "text-amber-600" : rank === 1 ? "text-gray-500" : rank === 2 ? "text-orange-500" : "text-gray-300"}`}>
                    {rank + 1}
                  </span>
                </TableCell>

                {/* Rider */}
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-red-800 font-semibold text-xs shrink-0 overflow-hidden">
                      {s.rider.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.rider.photoUrl} alt={s.rider.name} className="w-7 h-7 object-cover" />
                      ) : (
                        s.rider.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate leading-tight">{s.rider.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{s.rider.displayId}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Final score + rating */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 tabular-nums w-8">{s.finalScore}</span>
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${RATING_DOT[s.rating] ?? "bg-gray-200"}`} />
                      <span className={`text-[10px] font-medium hidden md:inline ${RATING_TEXT[s.rating] ?? "text-gray-400"}`}>
                        {s.rating}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Speed */}
                <TableCell><ScoreCell value={s.speedEfficiency} /></TableCell>

                {/* Completion */}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1 rounded-full bg-gray-100 hidden sm:block">
                      <div className="h-1 rounded-full bg-green-400" style={{ width: `${s.completionRate}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-gray-600">{s.completionRate}%</span>
                  </div>
                </TableCell>

                {/* Consistency */}
                <TableCell><ScoreCell value={s.consistency} /></TableCell>

                {/* Stops */}
                <TableCell>
                  <span className="text-xs text-gray-600 tabular-nums">
                    {s.stats.completedStops}
                    <span className="text-gray-300">/{s.stats.assignedStops}</span>
                  </span>
                </TableCell>

                {/* Distance */}
                <TableCell>
                  <span className="text-xs text-gray-500 tabular-nums">
                    {s.stats.totalDistanceKm > 0 ? `${s.stats.totalDistanceKm} km` : "—"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PerformanceDetailPanel
        score={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
