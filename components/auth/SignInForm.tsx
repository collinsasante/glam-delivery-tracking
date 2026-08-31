"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function SignInForm() {
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotPending, setForgotPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError("");

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Sign in failed");
        return;
      }

      const { role } = await res.json();
      router.push(role === "Admin" ? "/dashboard" : "/rider");
    } catch (err) {
      console.error("[signIn] error:", err);
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setIsPending(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setForgotPending(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, forgotEmail);
      setForgotSent(true);
    } catch (err) {
      console.error("[forgotPassword] error:", err);
      setError("Could not send reset email. Check the address and try again.");
      setShowForgot(false);
    } finally {
      setForgotPending(false);
    }
  }

  if (showForgot) {
    return (
      <div className="space-y-5">
        {forgotSent ? (
          <div className="rounded-xl bg-green-50 px-4 py-4 text-sm text-green-800">
            <p className="font-semibold mb-1">Check your email</p>
            <p>A password reset link has been sent to <strong>{forgotEmail}</strong>.</p>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Reset your password</h3>
              <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send you a reset link.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="block text-[12.5px] font-semibold text-gray-700">
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full h-11 rounded-xl border-[1.5px] border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-4 text-sm focus:outline-none focus:ring-[3.5px] focus:ring-black/[0.06] focus:border-gray-900 transition"
              />
            </div>
            <button
              type="submit"
              disabled={forgotPending}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-red-800 hover:bg-red-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-[14.5px] shadow-[0_10px_22px_-8px_rgba(153,27,27,0.55)] transition"
            >
              {forgotPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send reset link"}
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-[12.5px] font-semibold text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@packglamour.com"
          required
          autoComplete="email"
          className="w-full h-11 rounded-xl border-[1.5px] border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-4 text-sm focus:outline-none focus:ring-[3.5px] focus:ring-black/[0.06] focus:border-gray-900 transition"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-[12.5px] font-semibold text-gray-700">
            Password
          </label>
          <button
            type="button"
            onClick={() => { setShowForgot(true); setError(""); }}
            className="text-xs text-red-800 hover:text-red-700 transition font-semibold"
          >
            Forgot?
          </button>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className="w-full h-11 rounded-xl border-[1.5px] border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-4 text-sm focus:outline-none focus:ring-[3.5px] focus:ring-black/[0.06] focus:border-gray-900 transition"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          id="remember"
          name="remember"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-red-800 focus:ring-red-800"
        />
        <label htmlFor="remember" className="text-sm text-gray-600 select-none">
          Remember me
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-red-800 hover:bg-red-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-[14.5px] shadow-[0_10px_22px_-8px_rgba(153,27,27,0.55)] transition mt-1"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
