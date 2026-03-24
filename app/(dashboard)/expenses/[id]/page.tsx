export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Receipt, User, Calendar, FileText, MessageSquare, ExternalLink } from "lucide-react";
import { getExpenseById } from "@/services/expenses";
import { getRiderById } from "@/services/riders";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpenseActions } from "@/components/expenses/ExpenseActions";

export const metadata: Metadata = { title: "Expense Detail" };

interface Props {
  params: Promise<{ id: string }>;
}

const statusStyles: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-0",
  Approved: "bg-red-100 text-red-800 border-0",
  Paid: "bg-green-100 text-green-800 border-0",
  Rejected: "bg-gray-200 text-gray-500 border-0",
};

export default async function ExpenseDetailPage({ params }: Props) {
  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) notFound();

  const rider = expense.riderId ? await getRiderById(expense.riderId) : null;

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{expense.expenseType}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Expense #{id.slice(-6).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={statusStyles[expense.status] ?? "bg-gray-100 text-gray-600 border-0"}>
              {expense.status}
            </Badge>
            <ExpenseActions expense={expense} />
          </div>
        </div>
      </div>

      {/* Amount */}
      <Card className="border-gray-200 shadow-none">
        <CardContent className="p-5">
          <p className="text-xs text-gray-400 mb-1">Amount</p>
          <p className="text-4xl font-bold text-gray-900">GH₵{expense.amount.toFixed(2)}</p>
        </CardContent>
      </Card>

      {/* Details */}
      <Card className="border-gray-200 shadow-none">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Rider</p>
              {rider ? (
                <Link href={`/riders/${rider.id}`} className="font-medium text-red-800 hover:text-red-700">
                  {rider.name} · {rider.riderId}
                </Link>
              ) : (
                <p className="font-medium text-gray-700">{expense.riderId}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Date</p>
              <p className="font-medium text-gray-700">{expense.date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Receipt className="h-4 w-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Type</p>
              <p className="font-medium text-gray-700">{expense.expenseType}</p>
            </div>
          </div>

          {expense.description && (
            <div className="flex items-start gap-3 text-sm">
              <FileText className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Description</p>
                <p className="text-gray-700">{expense.description}</p>
              </div>
            </div>
          )}

          {expense.adminNotes && (
            <div className="flex items-start gap-3 text-sm">
              <MessageSquare className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Admin notes</p>
                <p className="text-gray-700">{expense.adminNotes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt */}
      {expense.receiptUrl && (
        <Card className="border-gray-200 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">Receipt</p>
              <a
                href={expense.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-red-800 hover:text-red-700"
              >
                <ExternalLink className="h-3 w-3" />
                Open full size
              </a>
            </div>
            <div className="relative w-full rounded-xl overflow-hidden border border-gray-100 bg-gray-50" style={{ height: "240px" }}>
              <Image
                src={expense.receiptUrl}
                alt="Receipt"
                fill
                className="object-contain"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-gray-400">
        Submitted {expense.submittedAt ? new Date(expense.submittedAt).toLocaleString("en-GB") : "—"}
      </p>
    </div>
  );
}
