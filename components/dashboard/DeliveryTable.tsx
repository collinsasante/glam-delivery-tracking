"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import { deleteDeliveryAction } from "@/actions/deliveries";
import { toast } from "sonner";
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Delivery } from "@/types/delivery";

const PAGE_SIZE = 20;

interface Props {
  deliveries: Delivery[];
}

function formatTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function DeliveryTable({ deliveries }: Props) {
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const totalPages = Math.ceil(deliveries.length / PAGE_SIZE);
  const paged = deliveries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!confirm(`Delete delivery for ${name}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteDeliveryAction(id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Delivery deleted");
      }
    });
  }

  if (deliveries.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white py-16 px-4 text-center">
        <p className="text-sm font-medium text-gray-600">No deliveries found</p>
        <p className="text-xs text-gray-400 mt-1">
          Try adjusting your filters or date range
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-100">
              <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pl-4">
                ID
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Customer
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Dropoff
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Rider
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Date
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Pickup
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Delivered
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Dist.
              </TableHead>
              <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Status
              </TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((d) => (
              <TableRow
                key={d.id}
                className="group hover:bg-gray-50/60 cursor-pointer border-b border-gray-50 last:border-0"
                onClick={() => router.push(`/deliveries/${d.id}`)}
              >
                <TableCell className="pl-4">
                  <span className="font-mono text-[11px] text-gray-400">
                    {d.deliveryId}
                  </span>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium text-gray-900 leading-tight">
                    {d.customerName}
                  </p>
                  {d.customerPhone && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {d.customerPhone}
                    </p>
                  )}
                </TableCell>
                <TableCell className="max-w-[160px]">
                  <p className="text-sm text-gray-600 truncate">
                    {d.dropoffLocation}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-gray-600">
                    {d.assignedRiderName ?? (
                      <span className="text-gray-300">Unassigned</span>
                    )}
                  </p>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600">{d.deliveryDate}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-[11px] text-gray-500">
                    {formatTime(d.pickupTime)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-[11px] text-gray-500">
                    {formatTime(d.deliveryTime)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[11px] text-gray-500">
                    {d.distance != null ? `${d.distance} km` : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <DeliveryStatusBadge status={d.status} />
                </TableCell>
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="pr-3"
                >
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/deliveries/${d.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        disabled={d.status === "Completed"}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => handleDelete(e, d.id, d.customerName)}
                      disabled={d.status === "Completed"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-gray-400">
            <span className="font-medium text-gray-600">{deliveries.length}</span>{" "}
            deliveries · page{" "}
            <span className="font-medium text-gray-600">{page}</span> of{" "}
            {totalPages}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-gray-200"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-gray-200"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
