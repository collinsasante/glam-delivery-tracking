"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { SessionPayload } from "@/lib/session";
import { createRiderSchema, updateRiderSchema } from "@/lib/validations";
import { adminAuth } from "@/lib/firebase-admin";
import { getAdminAuthErrorMessage } from "@/lib/auth-errors";
import {
  createRider,
  updateRider,
  deleteRider,
  getRiderByEmail,
  getRiderById,
} from "@/services/riders";
import { sendInviteEmail } from "@/lib/email";

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

  const { name, email, phone, role, vehicleType, active } = parsed.data;

  try {
    const existing = await getRiderByEmail(email);
    if (existing) return { error: "A user with that email already exists" };

    // Create Firebase user with a random temp password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();
    await adminAuth.createUser({ email, password: tempPassword, displayName: name });

    try {
      await createRider({ name, email, phone, role, vehicleType, active });
    } catch (dbErr) {
      // Postgres insert failed after the Firebase user was created — best-effort
      // compensation so we don't leave an orphaned Firebase account with no rider row.
      const fbUser = await adminAuth.getUserByEmail(email).catch(() => null);
      if (fbUser) {
        await adminAuth.deleteUser(fbUser.uid).catch((cleanupErr) => {
          console.error(
            `[createRiderAction] failed to roll back orphaned Firebase user for ${email} — manual cleanup needed:`,
            cleanupErr
          );
        });
      }
      throw dbErr;
    }

    // Send invite email — use Resend (branded) if configured, otherwise Firebase
    if (process.env.RESEND_API_KEY) {
      const inviteLink = await adminAuth.generatePasswordResetLink(email).catch(() => null);
      if (inviteLink) {
        await sendInviteEmail({ to: email, name, role, inviteLink }).catch((e) =>
          console.error("[invite] Resend email failed:", e)
        );
      }
    } else {
      await adminAuth.sendPasswordResetEmail(email).catch((e) =>
        console.error("[invite] Firebase password reset email failed:", e)
      );
    }

    revalidatePath("/riders");
    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    console.error("createRider error:", err);
    return { error: getAdminAuthErrorMessage(err, "Failed to create account.") };
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
    revalidatePath("/riders");
    revalidatePath(`/riders/${id}`);
    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    console.error("updateRider error:", err);
    return { error: getAdminAuthErrorMessage(err, "Failed to update rider.") };
  }
}

export async function deleteRiderAction(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  try {
    const rider = await getRiderById(id);
    // Delete the Postgres row first (cheap, and history-preserving FKs mean this
    // never fails on referential integrity). If the Firebase delete below fails,
    // the rider simply can't sign in anymore — safe to log and move on rather
    // than leaving the Postgres row (and thus sign-in access) around.
    await deleteRider(id);
    if (rider) {
      const fbUser = await adminAuth.getUserByEmail(rider.email).catch(() => null);
      if (fbUser) {
        await adminAuth.deleteUser(fbUser.uid).catch((cleanupErr) => {
          console.error(
            `[deleteRiderAction] rider ${id} deleted from Postgres but Firebase user cleanup failed — orphaned Firebase account for ${rider.email}:`,
            cleanupErr
          );
        });
      }
    }
    revalidatePath("/riders");
    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    console.error("deleteRider error:", err);
    return { error: "Failed to delete rider." };
  }
}
