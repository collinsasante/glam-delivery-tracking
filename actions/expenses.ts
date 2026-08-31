"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { SessionPayload } from "@/lib/session";
import { createExpenseSchema, adminCreateExpenseSchema } from "@/lib/validations";
import {
  createExpense,
  updateExpenseStatus,
  deleteExpense,
} from "@/services/expenses";
import { getRiderById } from "@/services/riders";
import { sendMattermostNotification } from "@/lib/mattermost";
import type { Expense } from "@/types/expense";

type ActionResult = { success: true } | { error: string };

export async function createExpenseAction(data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const riderId = session.user?.id;
  if (!riderId) return { error: "Rider not found" };

  const parsed = createExpenseSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = Object.values(
      parsed.error.flatten().fieldErrors
    )[0]?.[0];
    return { error: firstError ?? "Invalid form data" };
  }

  try {
    const expense = await createExpense({ riderId, ...parsed.data });

    const rider = await getRiderById(riderId).catch(() => null);
    void sendMattermostNotification(
      `🧾 **New expense submitted** — ${rider?.name ?? "A rider"} · ${expense.expenseType} · GH₵${expense.amount.toFixed(2)}`
    );

    revalidatePath("/rider/expenses");
    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (err) {
    console.error("createExpense error:", err);
    return { error: "Failed to submit expense." };
  }
}

export async function updateExpenseStatusAction(
  id: string,
  status: Expense["status"],
  adminNotes?: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session || (session.user as SessionPayload).role !== "Admin") {
    return { error: "Unauthorized" };
  }

  try {
    await updateExpenseStatus(id, status, adminNotes);
    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (err) {
    console.error("updateExpenseStatus error:", err);
    return { error: "Failed to update expense status." };
  }
}

export async function adminCreateExpenseAction(data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session || (session.user as SessionPayload).role !== "Admin") {
    return { error: "Unauthorized" };
  }

  const parsed = adminCreateExpenseSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = Object.values(
      parsed.error.flatten().fieldErrors
    )[0]?.[0];
    return { error: firstError ?? "Invalid form data" };
  }

  const { riderId, ...expenseData } = parsed.data;

  try {
    await createExpense({ riderId, ...expenseData });
    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (err) {
    console.error("adminCreateExpense error:", err);
    return { error: "Failed to create expense." };
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session || (session.user as SessionPayload).role !== "Admin") {
    return { error: "Unauthorized" };
  }

  try {
    await deleteExpense(id);
    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (err) {
    console.error("deleteExpense error:", err);
    return { error: "Failed to delete expense." };
  }
}
