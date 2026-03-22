import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RiderForm } from "@/components/riders/RiderForm";

export const metadata: Metadata = { title: "Add Rider" };

export default function NewRiderPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link
          href="/riders"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to riders
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Add Rider</h1>
      </div>
      <RiderForm />
    </div>
  );
}
