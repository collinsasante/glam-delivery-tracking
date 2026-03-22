import type { Metadata } from "next";
import Link from "next/link";
import { getActiveRiders } from "@/services/riders";
import { DeliveryForm } from "@/components/deliveries/DeliveryForm";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = { title: "New Delivery" };

export default async function NewDeliveryPage() {
  const riders = await getActiveRiders();

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

        <h1 className="text-xl font-semibold text-gray-900">New Delivery</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Create a single or multi-stop delivery
        </p>
      </div>

      <DeliveryForm riders={riders} />
    </div>
  );
}
