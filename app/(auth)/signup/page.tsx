export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionPayload } from "@/lib/session";
import { SignUpForm } from "@/components/auth/SignUpForm";
import Image from "next/image";

export const metadata: Metadata = { title: "Sign Up" };

export default async function SignUpPage() {
  const session = await auth();
  if (session) {
    const user = session.user as SessionPayload;
    redirect(user.role === "Admin" ? "/dashboard" : "/rider");
  }
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col items-center mb-6">
        <Image src="/logo.png" alt="Glam Delivery" width={56} height={56} className="rounded-2xl mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 text-center">Create your account</h2>
        <p className="text-sm text-gray-500 text-center mt-1">Join as a delivery rider</p>
      </div>
      <SignUpForm />
    </div>
  );
}
