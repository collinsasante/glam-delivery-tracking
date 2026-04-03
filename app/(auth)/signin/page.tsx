export const dynamic = "force-dynamic";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
        <p className="text-sm text-gray-500 mt-1">Enter your credentials below to sign in</p>
      </div>
      <SignInForm />
      <p className="text-center text-xs text-gray-400">
        Track deliveries in real-time →{" "}
        <a href="/board" className="text-red-800 hover:underline font-medium">
          Live Board
        </a>
      </p>
    </div>
  );
}
