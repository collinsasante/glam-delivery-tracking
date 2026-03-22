export const dynamic = "force-dynamic";
export const runtime = "edge";

import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionPayload } from "@/lib/session";

const SignUpForm = dynamic(
  () => import("@/components/auth/SignUpForm").then((m) => m.SignUpForm),
  { ssr: false }
);

export const metadata: Metadata = { title: "Sign Up" };

export default async function SignUpPage() {
  const session = await auth();
  if (session) {
    const user = session.user as SessionPayload;
    redirect(user.role === "Admin" ? "/dashboard" : "/rider");
  }
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
