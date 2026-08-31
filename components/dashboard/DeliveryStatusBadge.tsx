import { cn } from "@/lib/utils";
import type { DeliveryStatus } from "@/types/delivery";

const config: Record<DeliveryStatus, { dot: string; pill: string }> = {
  Pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-800",
  },
  "In Progress": {
    dot: "bg-blue-400",
    pill: "bg-blue-50 text-blue-800",
  },
  Completed: {
    dot: "bg-green-400",
    pill: "bg-green-50 text-green-800",
  },
  "On Hold": {
    dot: "bg-orange-400",
    pill: "bg-orange-50 text-orange-800",
  },
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const c = config[status];
  if (!c) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full text-xs font-semibold",
        c.pill
      )}
    >
      <span className={cn("size-[5px] rounded-full shrink-0", c.dot)} />
      {status}
    </span>
  );
}
