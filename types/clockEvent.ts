export type ClockEventType = "Clock In" | "Clock Out";

export interface ClockEvent {
  id: string;
  riderId: string;
  eventType: ClockEventType;
  date: string;
  time: string;
  timestamp: string;
  durationMins: number | null;
  /** GPS coordinates captured at clock-in (null for clock-out or if permission denied) */
  clockInLocation: { lat: number; lng: number } | null;
}
