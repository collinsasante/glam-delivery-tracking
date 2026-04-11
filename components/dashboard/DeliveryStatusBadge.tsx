import { cn } from "@/lib/utils";
import type { DeliveryStatus } from "@/types/delivery";

const config: Record<DeliveryStatus, { dot: string; pill: string }> = {
  Pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "In Progress": {
    dot: "bg-blue-400",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
  },
  Completed: {
    dot: "bg-green-400",
    pill: "bg-green-50 text-green-700 border-green-200",
  },
  "On Hold": {
    dot: "bg-orange-400",
    pill: "bg-orange-50 text-orange-700 border-orange-200",
  },
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const c = config[status];
  if (!c) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        c.pill
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", c.dot)} />
      {status}
    </span>
  );
}
