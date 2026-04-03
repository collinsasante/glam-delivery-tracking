export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionPayload } from "@/lib/session";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Sign Up" };

export default async function SignUpPage() {
  const session = await auth();
  if (session) {
    const user = session.user as SessionPayload;
    redirect(user.role === "Admin" ? "/dashboard" : "/rider");
  }
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Create an account</h2>
        <p className="text-sm text-gray-500 mt-1">Enter your details below to create your account</p>
      </div>
      <SignUpForm />
    </div>
  );
}
