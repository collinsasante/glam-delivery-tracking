export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { SessionPayload } from "@/lib/session";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign In" };

export default async function SignInPage() {
  const session = await auth();
  if (session) {
    const user = session.user as SessionPayload;
    redirect(user.role === "Admin" ? "/dashboard" : "/rider");
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-[26px] font-bold tracking-tight text-gray-900">Sign in</h2>
        <p className="text-sm text-gray-400 mt-2">Enter your credentials below to sign in</p>
      </div>
      <SignInForm />
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[11.5px] text-gray-300">Track a delivery instead?</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      <p className="text-center">
        <a href="/board" className="text-[13px] text-red-800 hover:text-red-900 font-semibold">
          Go to Live Board →
        </a>
      </p>
    </div>
  );
}
