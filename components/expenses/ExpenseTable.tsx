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
    pill: "bg-amber-50 text-amber-800",
  },
  Paid: {
    dot: "bg-green-400",
    pill: "bg-green-50 text-green-800",
  },
  Rejected: {
    dot: "bg-gray-300",
    pill: "bg-gray-100 text-gray-500",
  },
};

function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] ?? statusConfig.Pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full text-xs font-semibold",
        c.pill
      )}
    >
      <span className={cn("size-[5px] rounded-full shrink-0", c.dot)} />
      {status}
    </span>
  );
}

export function ExpenseTable({ expenses }: { expenses: ExpenseWithName[] }) {
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-black/[0.045] bg-white overflow-hidden shadow-[0_1px_2px_rgba(16,24,32,0.04),0_14px_28px_-18px_rgba(16,24,32,0.18)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#fafafb] hover:bg-[#fafafb] border-b border-black/[0.05]">
            <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em] pl-[22px]">
              Rider
            </TableHead>
            <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">
              Type
            </TableHead>
            <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">
              Amount
            </TableHead>
            <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">
              Date
            </TableHead>
            <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">
              Receipt
            </TableHead>
            <TableHead className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[0.06em]">
              Status
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => (
            <TableRow
              key={e.id}
              className="group hover:bg-[#fafafb] cursor-pointer border-b border-black/[0.045] last:border-0"
              onClick={() => router.push(`/expenses/${e.id}`)}
            >
              <TableCell className="pl-[22px] py-3.5">
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
                className="pr-4"
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
