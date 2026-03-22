import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getRiders } from "@/services/riders";
import { AdminExpenseForm } from "@/components/expenses/AdminExpenseForm";

export const metadata: Metadata = { title: "Add Expense" };

export default async function NewExpensePage() {
  const riders = await getRiders();
  const activeRiders = riders.filter((r) => r.active && r.role === "Rider");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to expenses
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Add Expense</h1>
      </div>
      <AdminExpenseForm riders={activeRiders} />
    </div>
  );
}
