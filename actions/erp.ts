"use server";

import { auth } from "@/auth";
import type { SessionPayload } from "@/lib/session";
import { erpEnabled, lookupErpOrder, type ErpOrder } from "@/lib/erp";

/** Admin-only: fetch an ERP order to prefill a delivery destination. */
export async function lookupErpOrderAction(ref: string): Promise<{ order: ErpOrder } | { error: string }> {
  const session = await auth();
  if (!session || (session.user as SessionPayload).role !== "Admin") return { error: "Unauthorized" };
  if (typeof ref !== "string" || ref.length > 40) return { error: "Invalid order number." };
  return lookupErpOrder(ref);
}

export async function erpEnabledAction(): Promise<boolean> {
  const session = await auth();
  if (!session || (session.user as SessionPayload).role !== "Admin") return false;
  return erpEnabled();
}
