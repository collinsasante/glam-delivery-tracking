"use client";

import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { deleteExpenseAction } from "@/actions/expenses";
import { toast } from "sonner";
import type { Expense } from "@/types/expense";

interface Props {
  expense: Expense;
}

export function ExpenseActions({ expense }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteExpenseAction(expense.id);
      if ("error" in result) toast.error(result.error);
      else toast.success("Expense deleted");
      setConfirmOpen(false);
    });
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          className="text-red-600 focus:text-red-700"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Delete expense?"
      description="Delete this expense? This cannot be undone."
      onConfirm={confirmDelete}
      isPending={isPending}
    />
    </>
  );
}
