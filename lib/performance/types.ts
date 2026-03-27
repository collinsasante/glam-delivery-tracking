export type Period = "daily" | "weekly" | "monthly";

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface StopRaw {
  id: string;
  distanceKm: number | null;
  durationMins: number | null;
  status: "Pending" | "In Progress" | "Completed";
  deliveryDate: string;
  arrivedAt: string | null;
}

export interface ClockEventRaw {
  eventType: "Clock In" | "Clock Out";
  date: string;
  time: string;
  timestamp: string;
  durationMins: number | null;
}

export interface RiderRawData {
  riderId: string;
  displayId: string;
  name: string;
  photoUrl: string | null;
  assignedStops: StopRaw[];
  clockEvents: ClockEventRaw[];
}

export interface DailyBreakdown {
  date: string;
  assignedStops: number;
  completedStops: number;
  distanceKm: number;
  clockedIn: boolean;
}

export type RatingLabel =
  | "Excellent"
  | "Very Good"
  | "Good"
  | "Average"
  | "Below Average"
  | "Needs Improvement"
  | "No Data";

export interface RiderPerformanceScore {
  rider: {
    id: string;
    displayId: string;
    name: string;
    photoUrl: string | null;
  };
  speedEfficiency: number | null;   // 0-100 or null
  completionRate: number;           // 0-100
  routeEfficiency: number | null;   // null — not computable in current schema
  consistency: number | null;       // 0-100 or null
  finalScore: number;               // 0-100 weighted
  rating: RatingLabel;
  stats: {
    assignedStops: number;
    completedStops: number;
    totalDistanceKm: number;
    totalDurationMins: number;
    avgMinutesPerKm: number | null;
    clockInDays: number;
    expectedWorkDays: number;
  };
  dailyBreakdown: DailyBreakdown[];
  clockEvents: ClockEventRaw[];
}

export interface FleetSummary {
  topPerformer: RiderPerformanceScore | null;
  fleetAvgScore: number;
  fleetAvgCompletionRate: number;
  totalCompletedStops: number;
  totalRiders: number;
}
