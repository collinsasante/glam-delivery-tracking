export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Phone,
  Navigation,
  Clock,
  Package,
  CheckCircle2,
  User,
  Calendar,
} from "lucide-react";
import { auth } from "@/auth";
import { getDeliveryById } from "@/services/deliveries";
import { getStopsForDelivery } from "@/services/stops";
import { cn } from "@/lib/utils";
import { DeliveryCommentForm } from "@/components/riders/DeliveryCommentForm";

export const metadata: Metadata = { title: "Delivery Details" };

interface Props {
  params: Promise<{ id: string }>;
}

function formatTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

const statusConfig = {
  Pending: { dot: "bg-amber-400", text: "text-amber-700", label: "Pending" },
  "In Progress": { dot: "bg-blue-400", text: "text-blue-700", label: "In Progress" },
  Completed: { dot: "bg-green-400", text: "text-green-700", label: "Delivered" },
  "On Hold": { dot: "bg-orange-400", text: "text-orange-700", label: "On Hold" },
};

export default async function RiderDeliveryDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/signin");

  const { id } = await params;
  console.log("[rider/deliveries/[id]] fetching delivery:", id);

  const delivery = await getDeliveryById(id);
  if (!delivery) notFound();

  // Riders can only view their own deliveries
  const riderId = session.user?.id;
  if (delivery.assignedRiderId && delivery.assignedRiderId !== riderId) {
    console.warn("[rider/deliveries/[id]] rider", riderId, "tried to view delivery assigned to", delivery.assignedRiderId);
    notFound();
  }

  const stops = await getStopsForDelivery(delivery.id);
  const completedStop = stops.find((s) => s.status === "Completed");
  const activeStop = stops.find((s) => s.status === "In Progress") ?? stops[0];
  const displayStop = completedStop ?? activeStop;
  const distanceKm = displayStop?.distanceKm ?? delivery.distance;
  const durationMins = completedStop?.durationMins ?? null;

  const sc = statusConfig[delivery.status] ?? statusConfig.Pending;

  const priorityConfig: Record<string, { label: string; className: string }> = {
    Normal: { label: "Normal", className: "bg-gray-100 text-gray-500" },
    Urgent: { label: "Urgent", className: "bg-red-100 text-red-700" },
    Express: { label: "Express", className: "bg-orange-100 text-orange-700" },
  };
  const priority = priorityConfig[delivery.priority] ?? priorityConfig.Normal;

  return (
    <div className="space-y-4 pb-8">
      {/* Back */}
      <Link
        href="/rider"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_12px_24px_-16px_rgba(16,24,32,0.2)] p-[18px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-[11px] text-gray-400">{delivery.deliveryId}</span>
              {delivery.priority !== "Normal" && (
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", priority.className)}>
                  {priority.label}
                </span>
              )}
            </div>
            <p className="text-[17px] font-bold text-gray-900 leading-tight">{delivery.customerName}</p>
            {delivery.orderId && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">Order #{delivery.orderId}</p>
            )}
          </div>
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0", sc.text, "bg-gray-50")}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sc.dot)} />
            {sc.label}
          </span>
        </div>
      </div>

      {/* Customer & delivery info */}
      <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_12px_24px_-16px_rgba(16,24,32,0.2)] p-[18px] space-y-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-300">Details</p>

        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-gray-700 font-medium">{delivery.customerName}</span>
        </div>

        {delivery.customerPhone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-gray-400 shrink-0" />
            <a href={`tel:${delivery.customerPhone}`} className="text-red-800 hover:underline">
              {delivery.customerPhone}
            </a>
          </div>
        )}

        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-gray-400">Deliver to</p>
            <span className="text-gray-700 leading-snug">{delivery.dropoffLocation}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-gray-400 shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400">From</p>
            <span className="text-gray-700">{displayStop?.fromLocation || delivery.warehouse || "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-gray-600">{delivery.deliveryDate}</span>
        </div>
      </div>

      {/* Times */}
      {(delivery.pickupTime || delivery.deliveryTime) && (
        <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_12px_24px_-16px_rgba(16,24,32,0.2)] p-[18px] space-y-3">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-300">Times</p>
          <div className="grid grid-cols-2 gap-3">
            {delivery.pickupTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Started</p>
                  <span className="font-mono text-gray-700">{formatTime(delivery.pickupTime)}</span>
                </div>
              </div>
            )}
            {delivery.deliveryTime && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Delivered</p>
                  <span className="font-mono text-gray-700">{formatTime(delivery.deliveryTime)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Distance & duration */}
      {(distanceKm != null || durationMins != null) && (
        <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_12px_24px_-16px_rgba(16,24,32,0.2)] p-[18px]">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-300 mb-3">Trip</p>
          <div className="flex items-center gap-6">
            {distanceKm != null && (
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Distance</p>
                  <span className="font-mono text-sm font-semibold text-gray-700">{distanceKm} km</span>
                </div>
              </div>
            )}
            {durationMins != null && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400">Duration</p>
                  <span className="font-mono text-sm font-semibold text-gray-700">{durationMins} min</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actual drop GPS */}
      {completedStop?.riderGps && (
        <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_12px_24px_-16px_rgba(16,24,32,0.2)] p-[18px]">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-300 mb-2">Delivered at</p>
          <a
            href={`https://maps.google.com/?q=${completedStop.riderGps.lat},${completedStop.riderGps.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-red-800 hover:underline"
          >
            {completedStop.riderGps.lat.toFixed(6)}, {completedStop.riderGps.lng.toFixed(6)} →
          </a>
        </div>
      )}

      {/* Notes */}
      {delivery.notes && (
        <div className="bg-white rounded-2xl border border-black/[0.045] shadow-[0_1px_2px_rgba(16,24,32,0.04),0_12px_24px_-16px_rgba(16,24,32,0.2)] p-[18px]">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-gray-300 mb-2">Notes</p>
          <p className="text-sm text-gray-600 leading-relaxed">{delivery.notes}</p>
        </div>
      )}

      {/* Rider comment */}
      <DeliveryCommentForm
        deliveryId={delivery.id}
        existingComment={delivery.riderComment}
      />
    </div>
  );
}
