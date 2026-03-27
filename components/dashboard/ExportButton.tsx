"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Delivery } from "@/types/delivery";

interface EnrichedDelivery extends Delivery {
  assignedRiderName: string | null;
}

function toCSV(rows: EnrichedDelivery[]): string {
  const headers = ["Delivery ID", "Customer", "Dropoff Location", "Rider", "Date", "Status", "Distance (km)"];
  const escape = (v: string | null | undefined) => {
    const s = v ?? "";
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((d) =>
      [
        d.deliveryId,
        d.customerName,
        d.dropoffLocation,
        d.assignedRiderName ?? "",
        d.deliveryDate,
        d.status,
        d.distance != null ? String(d.distance) : "",
      ]
        .map(escape)
        .join(",")
    ),
  ];
  return lines.join("\n");
}

export function ExportButton({ deliveries }: { deliveries: EnrichedDelivery[] }) {
  function handleExport() {
    const csv = toCSV(deliveries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deliveries-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
      <Download className="h-3.5 w-3.5" />
      Export
    </Button>
  );
}
