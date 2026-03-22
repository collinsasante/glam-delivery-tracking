import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getDeliveryById } from "@/services/deliveries";
import { getActiveRiders } from "@/services/riders";
import { DeliveryForm } from "@/components/deliveries/DeliveryForm";

export const metadata: Metadata = { title: "Edit Delivery" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditDeliveryPage({ params }: Props) {
  const { id } = await params;
  const [delivery, riders] = await Promise.all([
    getDeliveryById(id),
    getActiveRiders(),
  ]);

  if (!delivery) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Edit Delivery</h1>
        <p className="text-sm text-gray-500 mt-0.5 font-mono">{delivery.deliveryId}</p>
      </div>
      <DeliveryForm riders={riders} />
    </div>
  );
}
