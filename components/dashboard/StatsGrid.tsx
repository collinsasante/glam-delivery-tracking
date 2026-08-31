import Link from "next/link";
import { cn } from "@/lib/utils";
import { Clock, Truck, CheckCircle2, MapPin } from "lucide-react";
import type { Delivery } from "@/types/delivery";

interface Props {
  deliveries: Delivery[];
}

const CARD_SHADOW =
  "shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)]";

export function StatsGrid({ deliveries }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const todayCompleted = deliveries.filter(
    (d) => d.status === "Completed" && d.deliveryDate === today
  );
  const allCompleted = deliveries.filter((d) => d.status === "Completed");
  const totalDistance = allCompleted.reduce(
    (sum, d) => sum + (d.distance ?? 0),
    0
  );

  const stats = [
    {
      label: "Pending",
      value: deliveries.filter((d) => d.status === "Pending").length,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      href: "/deliveries?status=Pending",
    },
    {
      label: "In Progress",
      value: deliveries.filter((d) => d.status === "In Progress").length,
      icon: Truck,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      href: "/deliveries?status=In+Progress",
    },
    {
      label: "Completed Today",
      value: todayCompleted.length,
      icon: CheckCircle2,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      href: "/deliveries?status=Completed&date=today",
    },
    {
      label: "Total Distance",
      value: `${totalDistance.toFixed(1)} km`,
      icon: MapPin,
      iconBg: "bg-red-50",
      iconColor: "text-red-800",
      href: "/deliveries?status=Completed",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[18px]">
      {stats.map(({ label, value, icon: Icon, iconBg, iconColor, href }) => {
        const inner = (
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400 leading-none">
              {label}
            </span>
            <div className={cn("p-2 rounded-[9px] shrink-0", iconBg)}>
              <Icon className={cn("h-[15px] w-[15px]", iconColor)} strokeWidth={2} />
            </div>
          </div>
        );
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "bg-white rounded-2xl border border-black/[0.045] p-[22px] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,24,32,0.04),0_20px_34px_-18px_rgba(16,24,32,0.24)] transition-all block",
              CARD_SHADOW
            )}
          >
            {inner}
            <p className="text-[32px] font-extrabold tracking-tight mt-3.5 leading-none tabular-nums text-gray-900">
              {value}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
