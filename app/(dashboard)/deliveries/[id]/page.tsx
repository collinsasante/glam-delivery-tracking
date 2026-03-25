export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Phone,
  Navigation,
  User,
  Calendar,
  Clock,
  Package,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { getDeliveryById } from "@/services/deliveries";
import { getStopsForDelivery } from "@/services/stops";
import { getRiderById } from "@/services/riders";
import { Button } from "@/components/ui/button";
import { DeliveryStatusBadge } from "@/components/dashboard/DeliveryStatusBadge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Delivery Detail" };

interface Props {
  params: Promise<{ id: string }>;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  Normal: { label: "Normal", className: "bg-gray-100 text-gray-500" },
  Urgent: { label: "Urgent", className: "bg-red-100 text-red-700" },
  Express: { label: "Express", className: "bg-orange-100 text-orange-700" },
};

function formatTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default async function DeliveryDetailPage({ params }: Props) {
  const { id } = await params;
  const delivery = await getDeliveryById(id);
  if (!delivery) notFound();

  const [stops, rider] = await Promise.all([
    getStopsForDelivery(delivery.id),
    delivery.assignedRiderId ? getRiderById(delivery.assignedRiderId) : null,
  ]);

  const completedStop = stops.find((s) => s.status === "Completed");
  const activeStop = stops.find((s) => s.status === "In Progress") ?? stops[0];
  const priority = priorityConfig[delivery.priority] ?? priorityConfig.Normal;
  const isCompleted = delivery.status === "Completed";

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-gray-400">
                {delivery.deliveryId}
              </span>
              {delivery.priority !== "Normal" && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                    priority.className
                  )}
                >
                  {priority.label}
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              {delivery.customerName}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DeliveryStatusBadge status={delivery.status} />
            {!isCompleted && (
              <Link href={`/deliveries/${id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Customer
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="font-medium text-gray-900">
                {delivery.customerName}
              </span>
            </div>
            {delivery.customerPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <a
                  href={`tel:${delivery.customerPhone}`}
                  className="text-gray-600 hover:text-red-800"
                >
                  {delivery.customerPhone}
                </a>
              </div>
            )}
            {(completedStop ?? activeStop)?.fromLocation && (
              <div className="flex items-start gap-2 text-sm">
                <div className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Picked up from</p>
                  <span className="text-gray-600 leading-snug">
                    {(completedStop ?? activeStop)!.fromLocation}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <div className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Delivered to</p>
                <span className="text-gray-600 leading-snug">
                  {delivery.dropoffLocation}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Delivery
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-gray-600">{delivery.deliveryDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-gray-600">{delivery.warehouse}</span>
            </div>
            {delivery.distance != null && (
              <div className="flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-600">{delivery.distance} km</span>
              </div>
            )}
            {rider && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400 shrink-0" />
                <Link
                  href={`/riders/${rider.id}`}
                  className="text-red-800 hover:text-red-700 font-medium"
                >
                  {rider.name}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Times */}
        {(delivery.pickupTime || delivery.deliveryTime) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Times
            </p>
            <div className="space-y-2">
              {delivery.pickupTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-gray-500">Pickup:</span>
                  <span className="font-mono text-gray-700">
                    {formatTime(delivery.pickupTime)}
                  </span>
                </div>
              )}
              {delivery.deliveryTime && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-gray-500">Delivered:</span>
                  <span className="font-mono text-gray-700">
                    {formatTime(delivery.deliveryTime)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GPS delivery location */}
        {completedStop?.riderGps && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Delivery GPS
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-600 font-mono text-xs">
                    {completedStop.riderGps.lat.toFixed(6)},{" "}
                    {completedStop.riderGps.lng.toFixed(6)}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${completedStop.riderGps.lat},${completedStop.riderGps.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-800 hover:underline mt-0.5 inline-block"
                  >
                    View on Google Maps →
                  </a>
                </div>
              </div>
              {completedStop.durationMins && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-gray-500">Duration:</span>
                  <span className="text-gray-700">
                    {completedStop.durationMins} min
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Route: pickup → dropoff */}
      {(completedStop ?? activeStop) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Route
          </p>
          <div className="space-y-3">
            {(completedStop ?? activeStop)!.fromLocation && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Picked up from</p>
                  <p className="text-sm text-gray-700">
                    {(completedStop ?? activeStop)!.fromLocation}
                  </p>
                </div>
              </div>
            )}
            <div className="ml-1 w-px h-4 bg-gray-200" />
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">Delivered to</p>
                <p className="text-sm text-gray-700">{delivery.dropoffLocation}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {delivery.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Notes
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">{delivery.notes}</p>
        </div>
      )}

      {/* Order ID */}
      {delivery.orderId && (
        <p className="text-xs text-gray-400">
          Order ID: <span className="font-mono">{delivery.orderId}</span>
        </p>
      )}
    </div>
  );
}
