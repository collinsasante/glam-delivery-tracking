import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { expenses } from "@/lib/db/schema";
import type { Expense } from "@/types/expense";

type ExpenseRow = typeof expenses.$inferSelect;

function mapToExpense(row: ExpenseRow): Expense {
  return {
    id: String(row.id),
    riderId: row.riderId != null ? String(row.riderId) : "",
    riderName: null,
    expenseType: row.expenseType,
    amount: Number(row.amount),
    description: row.description ?? null,
    date: row.date,
    receiptUrl: row.receiptUrl ?? null,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    adminNotes: row.adminNotes ?? null,
  };
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const pk = Number(id);
  if (!Number.isInteger(pk)) return null;
  const [row] = await db.select().from(expenses).where(eq(expenses.id, pk)).limit(1);
  return row ? mapToExpense(row) : null;
}

export async function getExpenses(riderId?: string): Promise<Expense[]> {
  const query = db.select().from(expenses).orderBy(desc(expenses.submittedAt));

  if (riderId) {
    const riderPk = Number(riderId);
    if (!Number.isInteger(riderPk)) return [];
    const rows = await query.where(eq(expenses.riderId, riderPk));
    return rows.map(mapToExpense);
  }

  const rows = await query;
  return rows.map(mapToExpense);
}

export async function createExpense(data: {
  riderId: string;
  expenseType: string;
  amount: number;
  description?: string;
  date: string;
  receiptUrl?: string;
}): Promise<Expense> {
  const [row] = await db
    .insert(expenses)
    .values({
      riderId: Number(data.riderId),
      expenseType: data.expenseType,
      amount: String(data.amount),
      date: data.date,
      status: "Pending",
      description: data.description,
      receiptUrl: data.receiptUrl,
    })
    .returning();
  return mapToExpense(row);
}

export async function updateExpenseStatus(
  id: string,
  status: Expense["status"],
  adminNotes?: string
): Promise<void> {
  const pk = Number(id);
  await db
    .update(expenses)
    .set({ status, ...(adminNotes !== undefined && { adminNotes }) })
    .where(eq(expenses.id, pk));
}

export async function deleteExpense(id: string): Promise<void> {
  const pk = Number(id);
  await db.delete(expenses).where(eq(expenses.id, pk));
}
