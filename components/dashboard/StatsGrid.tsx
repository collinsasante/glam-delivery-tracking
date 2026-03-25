import Link from "next/link";
import { cn } from "@/lib/utils";
import { Clock, Truck, CheckCircle2, MapPin } from "lucide-react";
import type { Delivery } from "@/types/delivery";

interface Props {
  deliveries: Delivery[];
}

export function StatsGrid({ deliveries }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const todayCompleted = deliveries.filter(
    (d) => d.status === "Completed" && d.deliveryDate === today
  );
  const distanceToday = todayCompleted.reduce(
    (sum, d) => sum + (d.distance ?? 0),
    0
  );

  const stats = [
    {
      label: "Pending",
      value: deliveries.filter((d) => d.status === "Pending").length,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      href: "/deliveries?status=Pending",
    },
    {
      label: "In Progress",
      value: deliveries.filter((d) => d.status === "In Progress").length,
      icon: Truck,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      href: "/deliveries?status=In+Progress",
    },
    {
      label: "Completed Today",
      value: todayCompleted.length,
      icon: CheckCircle2,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
      href: "/deliveries?status=Completed&date=today",
    },
    {
      label: "Distance Today",
      value: `${distanceToday.toFixed(1)} km`,
      icon: MapPin,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      href: "/deliveries?status=Completed&date=today",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, iconBg, iconColor, href }) => {
        const inner = (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none">
                {label}
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-3 leading-none tabular-nums">
                {value}
              </p>
            </div>
            <div className={cn("p-2 rounded-lg shrink-0", iconBg)}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
          </div>
        );
        return href ? (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all block"
          >
            {inner}
          </Link>
        ) : (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
