import type { Period, DateRange } from "./types";

export function getDateRange(period: Period, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  if (period === "daily") {
    return { start: todayStr, end: todayStr };
  }

  if (period === "weekly") {
    const day = now.getUTCDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - daysFromMonday);
    return { start: monday.toISOString().split("T")[0], end: todayStr };
  }

  if (period === "yearly") {
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return { start: yearStart.toISOString().split("T")[0], end: todayStr };
  }

  if (period === "custom" && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start: monthStart.toISOString().split("T")[0], end: todayStr };
}

export function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00Z");
  const endDate = new Date(end + "T00:00:00Z");
  while (cur <= endDate) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export function formatPeriodLabel(period: Period): string {
  if (period === "daily") return "Today";
  if (period === "weekly") return "This Week";
  if (period === "yearly") return "This Year";
  if (period === "custom") return "Custom";
  return "This Month";
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" });
}
