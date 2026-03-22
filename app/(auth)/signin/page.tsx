export const dynamic = "force-dynamic";
export const runtime = "edge";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionPayload } from "@/lib/session";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign In" };

export default async function SignInPage() {
  console.log("[signin] page rendering, env check:", {
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  });
  const session = await auth();
  if (session) {
    const user = session.user as SessionPayload;
    redirect(user.role === "Admin" ? "/dashboard" : "/rider");
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
        Sign in to your account
      </h2>
      <p className="text-sm text-gray-500 text-center mb-8">
        Welcome back — enter your credentials below
      </p>
      <SignInForm />
    </div>
  );
}
