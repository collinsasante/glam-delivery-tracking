export type StopStatus = "Pending" | "In Progress" | "Completed";

export interface DeliveryStop {
  id: string;
  deliveryRecordId: string;
  stopNumber: number;
  fromLocation: string;
  toLocation: string;
  dropoffLocation: string;
  distanceKm: number | null;
  plannedDistanceKm: number | null;
  startedAt: string | null;
  arrivedAt: string | null;
  durationMins: number | null;
  status: StopStatus;
  riderGps: { lat: number; lng: number } | null;
  riderIp: string | null;
}
