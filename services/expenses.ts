import "server-only";
import {
  airtableList,
  airtableGet,
  airtableCreate,
  airtableUpdate,
  airtableDelete,
  escapeAirtableValue,
} from "@/lib/airtable";
import type { Expense } from "@/types/expense";

interface ExpenseFields {
  Rider?: string[];
  "Expense Type"?: string;
  Amount?: number;
  Description?: string;
  Date?: string;
  Receipt?: { url: string }[];
  Status?: string;
  "Submitted At"?: string;
  "Admin Notes"?: string;
}

function mapToExpense(
  record: { id: string; fields: ExpenseFields }
): Expense {
  const f = record.fields;
  return {
    id: record.id,
    riderId: f["Rider"]?.[0] ?? "",
    riderName: null,
    expenseType: f["Expense Type"] ?? "",
    amount: f["Amount"] ?? 0,
    description: f["Description"] ?? null,
    date: f["Date"] ?? "",
    receiptUrl: f["Receipt"]?.[0]?.url ?? null,
    status: (f["Status"] as Expense["status"]) ?? "Pending",
    submittedAt: f["Submitted At"] ?? "",
    adminNotes: f["Admin Notes"] ?? null,
  };
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  try {
    const record = await airtableGet<ExpenseFields>("Expenses", id);
    return mapToExpense(record);
  } catch {
    return null;
  }
}

export async function getExpenses(riderId?: string): Promise<Expense[]> {
  const params: { sort: Array<{ field: string; direction: "asc" | "desc" }>; filterByFormula?: string } = {
    sort: [{ field: "Submitted At", direction: "desc" }],
  };

  if (riderId) {
    params.filterByFormula = `FIND("${escapeAirtableValue(riderId)}", ARRAYJOIN({Rider}))`;
  }

  const records = await airtableList<ExpenseFields>("Expenses", params);
  return records.map(mapToExpense);
}

export async function createExpense(data: {
  riderId: string;
  expenseType: string;
  amount: number;
  description?: string;
  date: string;
  receiptUrl?: string;
}): Promise<Expense> {
  const fields: Record<string, unknown> = {
    Rider: [data.riderId],
    "Expense Type": data.expenseType,
    Amount: data.amount,
    Date: data.date,
    Status: "Pending",
    "Submitted At": new Date().toISOString(),
  };
  if (data.description) fields["Description"] = data.description;
  if (data.receiptUrl) {
    fields["Receipt"] = [{ url: data.receiptUrl }];
  }

  const record = await airtableCreate<ExpenseFields>("Expenses", fields);
  return mapToExpense(record);
}

export async function updateExpenseStatus(
  id: string,
  status: Expense["status"],
  adminNotes?: string
): Promise<void> {
  const fields: Record<string, unknown> = { Status: status };
  if (adminNotes !== undefined) fields["Admin Notes"] = adminNotes;
  await airtableUpdate("Expenses", id, fields);
}

export async function deleteExpense(id: string): Promise<void> {
  await airtableDelete("Expenses", id);
}
