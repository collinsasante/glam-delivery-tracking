"use client";

import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, XCircle, DollarSign, Trash2 } from "lucide-react";
import { updateExpenseStatusAction, deleteExpenseAction } from "@/actions/expenses";
import { toast } from "sonner";
import type { Expense } from "@/types/expense";


interface Props {
  expense: Expense;
}

export function ExpenseActions({ expense }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleStatus(status: Expense["status"]) {
    startTransition(async () => {
      const result = await updateExpenseStatusAction(expense.id, status);
      if ("error" in result) toast.error(result.error);
      else toast.success(`Expense marked as ${status}`);
    });
  }

  function handleDelete() {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteExpenseAction(expense.id);
      if ("error" in result) toast.error(result.error);
      else toast.success("Expense deleted");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-50"
        disabled={isPending}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {expense.status === "Pending" && (
          <>
            <DropdownMenuItem
              className="text-red-800 focus:text-red-700"
              onClick={() => handleStatus("Approved")}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-700"
              onClick={() => handleStatus("Rejected")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </DropdownMenuItem>
          </>
        )}
        {expense.status === "Approved" && (
          <DropdownMenuItem
            className="text-red-800"
            onClick={() => handleStatus("Paid")}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Mark as Paid
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-700"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
