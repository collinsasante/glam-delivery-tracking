"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signUpSchema } from "@/lib/validations";
import { createRider, getRiderByEmail } from "@/services/riders";
import { adminAuth } from "@/lib/firebase-admin";
import { getAdminAuthErrorMessage } from "@/lib/auth-errors";
import { SESSION_COOKIE } from "@/lib/session";

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/signin");
}

export async function signUpAction(
  _prevState: { error?: string; success?: boolean },
  formData: FormData
) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    password: formData.get("password") as string,
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = Object.values(
      parsed.error.flatten().fieldErrors
    )[0]?.[0];
    return { error: firstError ?? "Invalid form data" };
  }

  try {
    const existing = await getRiderByEmail(parsed.data.email);
    if (existing) return { error: "An account with that email already exists." };

    await adminAuth.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      displayName: parsed.data.name,
    });

    try {
      await createRider({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        role: "Rider",
      });
    } catch (dbErr) {
      const fbUser = await adminAuth.getUserByEmail(parsed.data.email).catch(() => null);
      if (fbUser) {
        await adminAuth.deleteUser(fbUser.uid).catch((cleanupErr) => {
          console.error(
            `[signUpAction] failed to roll back orphaned Firebase user for ${parsed.data.email} — manual cleanup needed:`,
            cleanupErr
          );
        });
      }
      throw dbErr;
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("[signUp] error:", err);
    return { error: getAdminAuthErrorMessage(err, "Failed to create account. Please try again.") };
  }
}
