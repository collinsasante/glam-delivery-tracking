export const dynamic = "force-dynamic";
export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getRiderById } from "@/services/riders";
import { getDeliveries } from "@/services/deliveries";
import { getStopsForDelivery } from "@/services/stops";
import { calculatePerformanceScore } from "@/lib/performance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Rider Performance" };

interface Props {
  params: Promise<{ riderId: string }>;
  searchParams: Promise<{ period?: string }>;
}

type Period = "daily" | "weekly" | "monthly";

const ratingColors: Record<string, string> = {
  Excellent: "bg-red-800 text-white",
  "Very Good": "bg-red-100 text-red-800",
  Good: "bg-red-50 text-red-700",
  Average: "bg-gray-100 text-gray-700",
  "Below Average": "bg-gray-100 text-gray-500",
  "Needs Improvement": "bg-gray-200 text-gray-600",
  "No Data": "bg-gray-100 text-gray-400",
};

const periodLabels: Record<Period, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
};

export default async function RiderPerformancePage({ params, searchParams }: Props) {
  const { riderId } = await params;
  const sp = await searchParams;
  const period = (sp.period ?? "daily") as Period;
  const dateFilter = period === "daily" ? "today" : period === "weekly" ? "week" : "month";

  const rider = await getRiderById(riderId);
  if (!rider) notFound();

  const deliveries = await getDeliveries({ riderId, date: dateFilter, status: "Completed" });
  const allStops = (await Promise.all(deliveries.map((d) => getStopsForDelivery(d.id)))).flat();
  const score = calculatePerformanceScore(allStops, period);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/performance"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to performance
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-800 font-bold text-lg shrink-0">
              {rider.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{rider.name}</h1>
              <p className="text-sm text-gray-400">{rider.riderId}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
              <Link
                key={p}
                href={`/performance/${riderId}?period=${p}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Score card */}
      <Card className="border-gray-200 shadow-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-gray-400 mb-1">{periodLabels[period]} score</p>
              <p className="text-5xl font-bold text-gray-900">{score.overallScore}</p>
            </div>
            <Badge className={`text-sm px-3 py-1 border-0 ${ratingColors[score.rating] ?? "bg-gray-100 text-gray-600"}`}>
              {score.rating}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-5 border-t border-gray-100">
            {[
              { label: "Speed Efficiency", value: score.metrics.speedEfficiency, weight: "40% weight" },
              { label: "Completion Rate", value: score.metrics.completionRate, weight: "30% weight" },
              { label: "Distance Score", value: score.metrics.distanceScore, weight: "20% weight" },
              { label: "Consistency", value: score.metrics.consistency, weight: "10% weight" },
            ].map(({ label, value, weight }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="text-sm font-semibold text-gray-900">{value}</p>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-red-800 transition-all"
                    style={{ width: `${value}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{weight}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Deliveries", value: score.totalDeliveries },
          { label: "Completed", value: score.completedDeliveries },
          { label: "Distance", value: `${score.totalDistanceKm} km` },
        ].map(({ label, value }) => (
          <Card key={label} className="border-gray-200 shadow-none">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deliveries list */}
      {deliveries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Completed deliveries</h2>
          {deliveries.map((d) => (
            <Link key={d.id} href={`/deliveries/${d.id}/edit`}>
              <Card className="border-gray-200 shadow-none hover:border-red-200 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.customerName}</p>
                    <p className="text-xs text-gray-400 truncate">{d.dropoffLocation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{d.deliveryDate}</p>
                    {d.distance != null && (
                      <p className="text-xs text-gray-400">{d.distance} km</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
