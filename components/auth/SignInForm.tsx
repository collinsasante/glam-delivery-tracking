"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import { getSignInErrorMessage, getPasswordResetErrorMessage, isSignInCancelled } from "@/lib/auth-errors";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";

export function SignInForm() {
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotPending, setForgotPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function establishSession(idToken: string) {
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
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsGooglePending(true);
    try {
      const cred = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      await establishSession(await cred.user.getIdToken());
    } catch (err) {
      if (!isSignInCancelled(err)) {
        console.error("[googleSignIn] error:", err);
        setError(getSignInErrorMessage(err));
      }
    } finally {
      setIsGooglePending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError("");

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      await establishSession(await cred.user.getIdToken());
    } catch (err) {
      console.error("[signIn] error:", err);
      setError(getSignInErrorMessage(err));
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
      setError(getPasswordResetErrorMessage(err));
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
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className="w-full h-11 rounded-xl border-[1.5px] border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 pl-4 pr-11 text-sm focus:outline-none focus:ring-[3.5px] focus:ring-black/[0.06] focus:border-gray-900 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-400">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGooglePending}
        className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed text-gray-700 font-semibold text-[14.5px] transition"
      >
        {isGooglePending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
        Continue with Google
      </button>
    </form>
  );
}
