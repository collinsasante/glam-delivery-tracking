export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getExpenses } from "@/services/expenses";
import { getRiders } from "@/services/riders";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const [expenses, riders] = await Promise.all([getExpenses(), getRiders()]);

  const riderMap = Object.fromEntries(riders.map((r) => [r.id, r.name]));
  const expensesWithNames = expenses.map((e) => ({
    ...e,
    riderName: riderMap[e.riderId] ?? "Unknown",
  }));

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {expenses.length > 0
              ? `${expenses.length} records · GH₵${totalAmount.toFixed(2)} total`
              : "No expenses yet"}
          </p>
        </div>
        <Link href="/expenses/new">
          <Button className="bg-red-800 hover:bg-red-900 gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 px-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3 mx-auto">
            <Receipt className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No expenses yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Add an expense to get started
          </p>
        </div>
      ) : (
        <ExpenseTable expenses={expensesWithNames} />
      )}
    </div>
  );
}
