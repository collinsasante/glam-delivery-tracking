"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { SessionPayload } from "@/lib/session";
import { createRiderSchema, updateRiderSchema } from "@/lib/validations";
import { adminAuth } from "@/lib/firebase-admin";
import {
  createRider,
  updateRider,
  deleteRider,
  getRiderByEmail,
  getRiderById,
} from "@/services/riders";

type ActionResult = { success: true } | { error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user as SessionPayload).role !== "Admin") {
    return null;
  }
  return session;
}

export async function createRiderAction(data: unknown): Promise<ActionResult> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  const parsed = createRiderSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = Object.values(
      parsed.error.flatten().fieldErrors
    )[0]?.[0];
    return { error: firstError ?? "Invalid form data" };
  }

  const { name, email, phone, password, role, vehicleType, active } = parsed.data;

  try {
    const existing = await getRiderByEmail(email);
    if (existing) return { error: "A rider with that email already exists" };

    await adminAuth.createUser({ email, password, displayName: name });
    await createRider({ name, email, phone, role, vehicleType, active });

    revalidatePath("/dashboard/riders");
    return { success: true };
  } catch (err) {
    console.error("createRider error:", err);
    return { error: "Failed to create rider." };
  }
}

export async function updateRiderAction(
  id: string,
  data: unknown
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  const parsed = updateRiderSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Invalid form data" };
  }

  const { name, email, phone, password, role, vehicleType, active } = parsed.data;

  try {
    const updates: Parameters<typeof updateRider>[1] = {
      name,
      email,
      phone,
      role,
      vehicleType,
      active,
    };

    if (password && password.length >= 8) {
      const rider = await getRiderById(id);
      if (rider) {
        const fbUser = await adminAuth.getUserByEmail(rider.email).catch(() => null);
        if (fbUser) await adminAuth.updateUser(fbUser.uid, { password });
      }
    }

    await updateRider(id, updates);
    revalidatePath("/dashboard/riders");
    revalidatePath(`/dashboard/riders/${id}`);
    return { success: true };
  } catch (err) {
    console.error("updateRider error:", err);
    return { error: "Failed to update rider." };
  }
}

export async function deleteRiderAction(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  try {
    const rider = await getRiderById(id);
    if (rider) {
      const fbUser = await adminAuth.getUserByEmail(rider.email).catch(() => null);
      if (fbUser) await adminAuth.deleteUser(fbUser.uid);
    }
    await deleteRider(id);
    revalidatePath("/dashboard/riders");
    return { success: true };
  } catch (err) {
    console.error("deleteRider error:", err);
    return { error: "Failed to delete rider." };
  }
}
