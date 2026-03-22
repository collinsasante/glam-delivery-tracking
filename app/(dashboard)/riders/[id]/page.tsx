export const dynamic = "force-dynamic";
export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, Phone, Truck, Calendar, Package } from "lucide-react";
import { getRiderById } from "@/services/riders";
import { getDeliveries } from "@/services/deliveries";

export const metadata: Metadata = { title: "Rider Profile" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RiderDetailPage({ params }: Props) {
  const { id } = await params;
  const rider = await getRiderById(id);
  if (!rider) notFound();

  const deliveries = await getDeliveries({ riderId: id });
  const completed = deliveries.filter((d) => d.status === "Completed");
  const totalDistance = completed.reduce((sum, d) => sum + (d.distance ?? 0), 0);
  const completionRate =
    deliveries.length > 0
      ? Math.round((completed.length / deliveries.length) * 100)
      : 0;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Back */}
      <Link
        href="/riders"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        All riders
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-800 font-bold text-xl shrink-0 overflow-hidden">
            {rider.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={rider.photoUrl}
                alt={rider.name}
                className="w-14 h-14 object-cover"
              />
            ) : (
              rider.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900">
                {rider.name}
              </h1>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  rider.role === "Admin"
                    ? "bg-red-800 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {rider.role}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  rider.active
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {rider.active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{rider.riderId}</p>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>{rider.email}</span>
              </div>
              {rider.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <a href={`tel:${rider.phone}`} className="hover:text-red-800 transition-colors">
                    {rider.phone}
                  </a>
                </div>
              )}
              {rider.vehicleType && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Truck className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="capitalize">{rider.vehicleType}</span>
                </div>
              )}
              {rider.joinedDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span>Joined {rider.joinedDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: deliveries.length, sub: "deliveries" },
          { label: "Completed", value: completed.length, sub: "deliveries" },
          { label: "Completion", value: `${completionRate}%`, sub: "rate" },
          { label: "Distance", value: `${totalDistance.toFixed(1)}`, sub: "km covered" },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center"
          >
            <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
              {value}
            </p>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mt-1.5">
              {label}
            </p>
            <p className="text-[10px] text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent deliveries */}
      {deliveries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400" />
            Recent deliveries
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {deliveries.slice(0, 8).map((d, i) => (
              <Link
                key={d.id}
                href={`/deliveries/${d.id}/edit`}
                className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
                  i > 0 ? "border-t border-gray-50" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {d.customerName}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {d.dropoffLocation}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs text-gray-500">{d.deliveryDate}</p>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium mt-0.5 ${
                      d.status === "Completed"
                        ? "text-green-600"
                        : d.status === "In Progress"
                        ? "text-blue-600"
                        : "text-amber-600"
                    }`}
                  >
                    <span
                      className={`w-1 h-1 rounded-full ${
                        d.status === "Completed"
                          ? "bg-green-400"
                          : d.status === "In Progress"
                          ? "bg-blue-400"
                          : "bg-amber-400"
                      }`}
                    />
                    {d.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
