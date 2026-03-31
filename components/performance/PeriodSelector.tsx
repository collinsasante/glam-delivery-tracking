"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Period } from "@/lib/performance/types";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Today",
  weekly: "Week",
  monthly: "Month",
  yearly: "Year",
  custom: "Custom",
};

const PERIODS: Period[] = ["daily", "weekly", "monthly", "yearly", "custom"];

interface Props {
  current: Period;
  customFrom?: string;
  customTo?: string;
}

export function PeriodSelector({ current, customFrom, customTo }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [from, setFrom] = useState(customFrom ?? today);
  const [to, setTo] = useState(customTo ?? today);

  function applyCustom() {
    if (from && to) {
      router.push(`/performance?period=custom&from=${from}&to=${to}`);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => {
              if (p !== "custom") {
                router.push(`/performance?period=${p}`);
              } else {
                router.push(`/performance?period=custom&from=${from}&to=${to}`);
              }
            }}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors",
              current === p
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {current === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-red-800"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-red-800"
          />
          <button
            onClick={applyCustom}
            className="text-xs px-2.5 py-1 rounded-md bg-red-800 text-white font-medium hover:bg-red-900 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
