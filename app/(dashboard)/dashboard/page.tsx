import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getDeliveries } from "@/services/deliveries";
import { getRiders } from "@/services/riders";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { DeliveryTable } from "@/components/dashboard/DeliveryTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Plus } from "lucide-react";
import type { DeliveryStatus } from "@/types/delivery";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    status?: string;
    date?: string;
    search?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = (params.status ?? "All") as DeliveryStatus | "All";
  const date = (params.date ?? "all") as "today" | "week" | "month" | "all";
  const search = params.search ?? "";

  const [deliveries, allDeliveries, riders] = await Promise.all([
    getDeliveries({ status, date, search }),
    getDeliveries({}),
    getRiders(),
  ]);
  const riderMap = Object.fromEntries(riders.map((r) => [r.id, r.name]));
  const enriched = deliveries.map((d) => ({
    ...d,
    assignedRiderName: d.assignedRiderId ? (riderMap[d.assignedRiderId] ?? null) : null,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link href="/deliveries/new">
          <Button className="bg-red-800 hover:bg-red-900 gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            New Delivery
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        }
      >
        <StatsGrid deliveries={allDeliveries} />
      </Suspense>

      {/* Deliveries section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Deliveries
            <span className="ml-2 font-normal text-gray-400">
              ({enriched.length})
            </span>
          </h2>
          <SearchInput defaultValue={search} placeholder="Search…" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <FilterLink href="/dashboard" params={params} paramKey="status" value="" label="All" />
            <FilterLink href="/dashboard" params={params} paramKey="status" value="Pending" label="Pending" />
            <FilterLink href="/dashboard" params={params} paramKey="status" value="In Progress" label="In Progress" />
            <FilterLink href="/dashboard" params={params} paramKey="status" value="Completed" label="Completed" />
          </div>

          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <FilterLink href="/dashboard" params={params} paramKey="date" value="" label="All time" />
            <FilterLink href="/dashboard" params={params} paramKey="date" value="today" label="Today" />
            <FilterLink href="/dashboard" params={params} paramKey="date" value="week" label="This week" />
            <FilterLink href="/dashboard" params={params} paramKey="date" value="month" label="This month" />
          </div>
        </div>

        <DeliveryTable deliveries={enriched} />
      </div>
    </div>
  );
}

function FilterLink({
  href,
  params,
  paramKey,
  value,
  label,
}: {
  href: string;
  params: Record<string, string | undefined>;
  paramKey: string;
  value: string;
  label: string;
}) {
  const current = params[paramKey] ?? "";
  const isActive = current === value;
  const newParams = new URLSearchParams(
    Object.entries({ ...params, [paramKey]: value }).filter(
      ([, v]) => v
    ) as [string, string][]
  );
  const url = newParams.toString() ? `${href}?${newParams}` : href;

  return (
    <Link
      href={url}
      className={cn(
        "px-3 py-1 rounded-md text-xs font-medium transition-colors",
        isActive
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      )}
    >
      {label}
    </Link>
  );
}
