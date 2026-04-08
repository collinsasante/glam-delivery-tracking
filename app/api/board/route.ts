import { getDeliveries } from "@/services/deliveries";
import { getRiders } from "@/services/riders";

export const dynamic = "force-dynamic";

export async function GET() {
  const [deliveries, riders] = await Promise.all([
    getDeliveries({}),
    getRiders(),
  ]);

  const riderMap = Object.fromEntries(riders.map((r) => [r.id, r.name]));

  const enriched = deliveries.map((d) => ({
    ...d,
    assignedRiderName: d.assignedRiderId ? (riderMap[d.assignedRiderId] ?? null) : null,
  }));

  const stats = {
    total: enriched.length,
    pending: enriched.filter((d) => d.status === "Pending").length,
    inProgress: enriched.filter((d) => d.status === "In Progress").length,
    completed: enriched.filter((d) => d.status === "Completed").length,
  };

  return Response.json({ deliveries: enriched, stats });
}
