export const dynamic = "force-dynamic";
export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RiderExpenseForm } from "@/components/expenses/RiderExpenseForm";

export const metadata: Metadata = { title: "Submit Expense" };

export default function RiderNewExpensePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/rider"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Submit Expense</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Submit a work-related expense for review
        </p>
      </div>
      <RiderExpenseForm />
    </div>
  );
}
