import "server-only";
import type {
  RiderRawData,
  RiderPerformanceScore,
  FleetSummary,
  DailyBreakdown,
  RatingLabel,
  DateRange,
} from "./types";
import { datesBetween } from "./dateUtils";

const WEIGHTS = { speedEfficiency: 0.4, completionRate: 0.3, routeEfficiency: 0.2, consistency: 0.1 } as const;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getRating(score: number, hasData: boolean): RatingLabel {
  if (!hasData) return "No Data";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Average";
  if (score >= 50) return "Below Average";
  return "Needs Improvement";
}

function computeFleetBenchmark(allRiders: RiderRawData[]): number | null {
  const ratios: number[] = [];
  for (const rider of allRiders) {
    const usable = rider.assignedStops.filter(
      (s) => s.status === "Completed" && (s.distanceKm ?? 0) > 0 && (s.durationMins ?? 0) > 0
    );
    const dist = usable.reduce((s, x) => s + x.distanceKm!, 0);
    const dur = usable.reduce((s, x) => s + x.durationMins!, 0);
    if (dist > 0 && dur > 0) ratios.push(dur / dist);
  }
  return median(ratios);
}

function scoreRider(
  data: RiderRawData,
  fleetBenchmarkMinPerKm: number | null,
  range: DateRange
): RiderPerformanceScore {
  const stops = data.assignedStops;
  const completed = stops.filter((s) => s.status === "Completed");

  // —— Completion Rate (0-100) ——
  const completionRate = stops.length > 0 ? (completed.length / stops.length) * 100 : 0;

  // —— Speed Efficiency (0-100 | null) ——
  const measurable = completed.filter(
    (s) => (s.distanceKm ?? 0) > 0 && (s.durationMins ?? 0) > 0
  );
  const totalDistKm = measurable.reduce((s, x) => s + x.distanceKm!, 0);
  const totalDurMins = measurable.reduce((s, x) => s + x.durationMins!, 0);
  const avgMinPerKm = totalDistKm > 0 ? totalDurMins / totalDistKm : null;

  let speedEfficiency: number | null = null;
  if (avgMinPerKm !== null && fleetBenchmarkMinPerKm !== null && avgMinPerKm > 0) {
    speedEfficiency = Math.min(100, (fleetBenchmarkMinPerKm / avgMinPerKm) * 100);
  }

  // —— Route Efficiency (null — single distance field; can't separate planned vs actual) ——
  const routeEfficiency: number | null = null;

  // —— Consistency (0-100 | null) ——
  const clockInDates = new Set(
    data.clockEvents.filter((e) => e.eventType === "Clock In").map((e) => e.date)
  );
  const daysWithStops = new Set(stops.map((s) => s.deliveryDate).filter(Boolean));
  const expectedWorkDays = daysWithStops.size;
  const validClockInDays = [...clockInDates].filter((d) => daysWithStops.has(d)).length;
  const attendanceReliability = expectedWorkDays > 0 ? (validClockInDays / expectedWorkDays) * 100 : 0;

  const stopsByDay = new Map<string, { assigned: number; completed: number }>();
  for (const s of stops) {
    if (!s.deliveryDate) continue;
    const cur = stopsByDay.get(s.deliveryDate) ?? { assigned: 0, completed: 0 };
    cur.assigned++;
    if (s.status === "Completed") cur.completed++;
    stopsByDay.set(s.deliveryDate, cur);
  }
  const activeDays = stopsByDay.size;
  const daysAllCompleted = [...stopsByDay.values()].filter((d) => d.assigned > 0 && d.completed === d.assigned).length;
  const dailyCompletionReliability = activeDays > 0 ? (daysAllCompleted / activeDays) * 100 : 0;

  const consistency: number | null =
    expectedWorkDays > 0 || activeDays > 0
      ? attendanceReliability * 0.5 + dailyCompletionReliability * 0.5
      : null;

  // —— Final score — re-weight when components are null ——
  const components: Array<{ score: number | null; weight: number }> = [
    { score: speedEfficiency, weight: WEIGHTS.speedEfficiency },
    { score: completionRate, weight: WEIGHTS.completionRate },
    { score: routeEfficiency, weight: WEIGHTS.routeEfficiency },
    { score: consistency, weight: WEIGHTS.consistency },
  ];
  const available = components.filter((c) => c.score !== null);
  const totalWeight = available.reduce((s, c) => s + c.weight, 0);
  const finalScore =
    available.length > 0 && totalWeight > 0
      ? Math.round(available.reduce((sum, c) => sum + c.score! * c.weight, 0) / totalWeight)
      : 0;

  // —— Daily breakdown ——
  const dailyBreakdown: DailyBreakdown[] = datesBetween(range.start, range.end).map((date) => {
    const ds = stops.filter((s) => s.deliveryDate === date);
    const dc = ds.filter((s) => s.status === "Completed");
    return {
      date,
      assignedStops: ds.length,
      completedStops: dc.length,
      distanceKm: dc.reduce((s, x) => s + (x.distanceKm ?? 0), 0),
      clockedIn: clockInDates.has(date),
    };
  });

  const allCompletedDist = completed.reduce((s, x) => s + (x.distanceKm ?? 0), 0);
  const allCompletedDur = completed.reduce((s, x) => s + (x.durationMins ?? 0), 0);

  return {
    rider: { id: data.riderId, displayId: data.displayId, name: data.name, photoUrl: data.photoUrl },
    speedEfficiency: speedEfficiency !== null ? Math.round(speedEfficiency) : null,
    completionRate: Math.round(completionRate),
    routeEfficiency: null,
    consistency: consistency !== null ? Math.round(consistency) : null,
    finalScore,
    rating: getRating(finalScore, stops.length > 0),
    stats: {
      assignedStops: stops.length,
      completedStops: completed.length,
      totalDistanceKm: Math.round(allCompletedDist * 10) / 10,
      totalDurationMins: allCompletedDur,
      avgMinutesPerKm: avgMinPerKm !== null ? Math.round(avgMinPerKm * 10) / 10 : null,
      clockInDays: validClockInDays,
      expectedWorkDays,
    },
    dailyBreakdown,
    clockEvents: data.clockEvents,
  };
}

export function computeFleetScores(
  allRiders: RiderRawData[],
  range: DateRange
): { scores: RiderPerformanceScore[]; summary: FleetSummary } {
  if (!allRiders.length) {
    return {
      scores: [],
      summary: { topPerformer: null, fleetAvgScore: 0, fleetAvgCompletionRate: 0, totalCompletedStops: 0, totalRiders: 0 },
    };
  }

  const benchmark = computeFleetBenchmark(allRiders);
  const scores = allRiders
    .map((r) => scoreRider(r, benchmark, range))
    .sort((a, b) => b.finalScore - a.finalScore);

  const withData = scores.filter((s) => s.stats.assignedStops > 0);
  const summary: FleetSummary = {
    topPerformer: withData[0] ?? null,
    fleetAvgScore:
      withData.length > 0
        ? Math.round(withData.reduce((s, x) => s + x.finalScore, 0) / withData.length)
        : 0,
    fleetAvgCompletionRate:
      withData.length > 0
        ? Math.round(withData.reduce((s, x) => s + x.completionRate, 0) / withData.length)
        : 0,
    totalCompletedStops: scores.reduce((s, x) => s + x.stats.completedStops, 0),
    totalRiders: withData.length,
  };

  return { scores, summary };
}
