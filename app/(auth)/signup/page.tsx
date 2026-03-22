export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Sign Up" };

export default function SignUpPage() {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
        Create your account
      </h2>
      <p className="text-sm text-gray-500 text-center mb-8">
        Join as a delivery rider
      </p>
      <SignUpForm />
    </div>
  );
}
