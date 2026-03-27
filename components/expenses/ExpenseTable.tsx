"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ExpenseActions } from "./ExpenseActions";
import type { Expense } from "@/types/expense";

interface ExpenseWithName extends Expense {
  riderName: string;
}

const statusConfig: Record<string, { dot: string; pill: string }> = {
  Pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
  },
  Paid: {
    dot: "bg-green-400",
    pill: "bg-green-50 text-green-700 border-green-200",
  },
  Rejected: {
    dot: "bg-gray-300",
    pill: "bg-gray-50 text-gray-500 border-gray-200",
  },
};

function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] ?? statusConfig.Pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        c.pill
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", c.dot)} />
      {status}
    </span>
  );
}

export function ExpenseTable({ expenses }: { expenses: ExpenseWithName[] }) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-b border-gray-100">
            <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pl-4">
              Rider
            </TableHead>
            <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Type
            </TableHead>
            <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Amount
            </TableHead>
            <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Date
            </TableHead>
            <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Receipt
            </TableHead>
            <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Status
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => (
            <TableRow
              key={e.id}
              className="group hover:bg-gray-50/60 cursor-pointer border-b border-gray-50 last:border-0"
              onClick={() => router.push(`/expenses/${e.id}`)}
            >
              <TableCell className="pl-4">
                <p className="text-sm font-medium text-gray-900">
                  {e.riderName}
                </p>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600">{e.expenseType}</span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm font-semibold text-gray-900">
                  GH₵{e.amount.toFixed(2)}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-500">{e.date}</span>
              </TableCell>
              <TableCell onClick={(ev) => ev.stopPropagation()}>
                {e.receiptUrl ? (
                  <a
                    href={e.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-red-800 hover:text-red-700 underline underline-offset-2"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={e.status} />
              </TableCell>
              <TableCell
                onClick={(ev) => ev.stopPropagation()}
                className="pr-3"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExpenseActions expense={e} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
