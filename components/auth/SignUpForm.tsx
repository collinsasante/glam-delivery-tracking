"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signUpAction } from "@/actions/auth";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(
    signUpAction as (s: { error?: string; success?: boolean }, f: FormData) => Promise<{ error?: string; success?: boolean }>,
    {}
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.push("/signin?registered=1");
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Full name
        </label>
        <input
          id="name"
          name="name"
          placeholder="Your name"
          required
          className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+233..."
          className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Min. 8 characters"
          required
          className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-800 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2.5 transition"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/signin" className="text-red-800 hover:text-red-700 font-medium transition">
          Sign in
        </Link>
      </p>

      <div className="pt-1 border-t border-gray-100 text-center">
        <Link
          href="/board"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          View live delivery board
        </Link>
      </div>
    </form>
  );
}
