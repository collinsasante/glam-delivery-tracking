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

  const pending = expenses.filter((e) => e.status === "Pending");
  const pendingTotal = pending.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pending.length > 0
              ? `${pending.length} pending · GH₵${pendingTotal.toFixed(2)} to review`
              : `${expenses.length} total expenses`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pending.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-xs font-medium text-amber-700">
                {pending.length} awaiting review
              </span>
            </div>
          )}
          <Link href="/dashboard/expenses/new">
            <Button className="bg-red-800 hover:bg-red-900 gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </Link>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 px-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3 mx-auto">
            <Receipt className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No expenses yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Rider-submitted expenses will appear here
          </p>
        </div>
      ) : (
        <ExpenseTable expenses={expensesWithNames} />
      )}
    </div>
  );
}
