import "server-only";

export interface StopMetric {
  distanceKm: number | null;
  durationMins: number | null;
  status: "Pending" | "In Progress" | "Completed";
}

export interface PerformanceScore {
  overallScore: number;
  rating: string;
  metrics: {
    speedEfficiency: number;
    completionRate: number;
    distanceScore: number;
    consistency: number;
  };
  totalDeliveries: number;
  completedDeliveries: number;
  totalDistanceKm: number;
}

const WEIGHTS = {
  speedEfficiency: 0.4,
  completionRate: 0.3,
  distanceScore: 0.2,
  consistency: 0.1,
} as const;

// ~2.4 km/h adjusted for city traffic
const EXPECTED_SPEED_KM_PER_MIN = 0.04;
const SPEED_BUFFER = 1.2;

const MAX_DISTANCE: Record<"daily" | "weekly" | "monthly", number> = {
  daily: 100,
  weekly: 500,
  monthly: 2000,
};

export function calculatePerformanceScore(
  stops: StopMetric[],
  period: "daily" | "weekly" | "monthly" = "daily"
): PerformanceScore {
  const total = stops.length;

  if (total === 0) return zeroScore();

  const completed = stops.filter((s) => s.status === "Completed");

  // Completion rate
  const completionRate = (completed.length / total) * 100;

  // Speed efficiency — only for stops with valid data
  const speedScores = completed
    .filter((s) => s.distanceKm && s.distanceKm > 0 && s.durationMins && s.durationMins > 0)
    .map((s) => {
      const expectedMins = (s.distanceKm! / EXPECTED_SPEED_KM_PER_MIN) * SPEED_BUFFER;
      return Math.min(100, (expectedMins / s.durationMins!) * 100);
    });

  const speedEfficiency =
    speedScores.length > 0
      ? speedScores.reduce((a, b) => a + b, 0) / speedScores.length
      : 0;

  // Distance score
  const totalDistanceKm = completed.reduce(
    (sum, s) => sum + (s.distanceKm ?? 0),
    0
  );
  const distanceScore = Math.min(
    100,
    (totalDistanceKm / MAX_DISTANCE[period]) * 100
  );

  // Consistency — lower std deviation = better score
  let consistency = 100;
  if (speedScores.length > 1) {
    const mean = speedScores.reduce((a, b) => a + b, 0) / speedScores.length;
    const variance =
      speedScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) /
      speedScores.length;
    consistency = Math.max(0, 100 - Math.sqrt(variance) * 2);
  }

  const overallScore = Math.round(
    speedEfficiency * WEIGHTS.speedEfficiency +
      completionRate * WEIGHTS.completionRate +
      distanceScore * WEIGHTS.distanceScore +
      consistency * WEIGHTS.consistency
  );

  return {
    overallScore,
    rating: getRating(overallScore),
    metrics: {
      speedEfficiency: Math.round(speedEfficiency),
      completionRate: Math.round(completionRate),
      distanceScore: Math.round(distanceScore),
      consistency: Math.round(consistency),
    },
    totalDeliveries: total,
    completedDeliveries: completed.length,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
  };
}

function getRating(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Average";
  if (score >= 50) return "Below Average";
  return "Needs Improvement";
}

function zeroScore(): PerformanceScore {
  return {
    overallScore: 0,
    rating: "No Data",
    metrics: {
      speedEfficiency: 0,
      completionRate: 0,
      distanceScore: 0,
      consistency: 0,
    },
    totalDeliveries: 0,
    completedDeliveries: 0,
    totalDistanceKm: 0,
  };
}
