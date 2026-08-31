export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StaffForm } from "@/components/staff/StaffForm";

export const metadata: Metadata = { title: "Add Staff" };

export default function NewStaffPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link
          href="/staff"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to staff
        </Link>
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Add Staff Member</h1>
        <p className="text-sm text-gray-400 mt-1">They will receive an email to set their password.</p>
      </div>
      <StaffForm />
    </div>
  );
}
