export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getRiderById } from "@/services/riders";
import { RiderEditForm } from "@/components/riders/RiderEditForm";

export const metadata: Metadata = { title: "Edit Rider" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RiderEditPage({ params }: Props) {
  const { id } = await params;
  const rider = await getRiderById(id);
  if (!rider) notFound();

  return (
    <div className="max-w-lg space-y-5">
      <Link
        href={`/riders/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to profile
      </Link>

      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Edit {rider.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{rider.riderId}</p>
      </div>

      <RiderEditForm
        id={id}
        defaultValues={{
          name: rider.name,
          email: rider.email,
          phone: rider.phone ?? undefined,
          role: rider.role as "Rider" | "Admin",
          vehicleType: rider.vehicleType as "motor" | "car" | "bike" | undefined,
          active: rider.active,
        }}
      />
    </div>
  );
}
