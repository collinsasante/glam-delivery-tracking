export const dynamic = "force-dynamic";
export const runtime = "edge";

import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign In" };

export default function SignInPage() {
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
