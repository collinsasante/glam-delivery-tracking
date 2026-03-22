export type ExpenseStatus = "Pending" | "Approved" | "Rejected" | "Paid";

export interface Expense {
  id: string;
  riderId: string;
  riderName: string | null;
  expenseType: string;
  amount: number;
  description: string | null;
  date: string;
  receiptUrl: string | null;
  status: ExpenseStatus;
  submittedAt: string;
  adminNotes: string | null;
}
