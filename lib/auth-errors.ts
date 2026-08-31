// Maps Firebase Auth error codes to user-facing messages. Two shapes come in:
// the client SDK (firebase/auth) throws FirebaseError with `.code` like
// "auth/invalid-credential"; the hand-rolled REST shim in firebase-admin.ts
// normalizes Google Identity Toolkit's raw strings (EMAIL_EXISTS, etc.) into
// the same "auth/xxx" shape — see toAuthErrorCode() there.

function codeOf(err: unknown): string {
  return typeof (err as { code?: unknown })?.code === "string" ? (err as { code: string }).code : "";
}

const SIGN_IN_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/user-disabled": "This account has been disabled. Contact your admin.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network error — check your connection and try again.",
  "auth/invalid-api-key": "Sign-in is temporarily unavailable. Please try again shortly.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Please allow popups and try again.",
  "auth/unauthorized-domain": "Sign-in isn't set up for this domain yet. Contact your admin.",
  "auth/operation-not-allowed": "Google sign-in isn't enabled yet. Contact your admin.",
};

// Not real errors — the user backed out of the Google popup themselves.
const SIGN_IN_CANCELLED_CODES = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

export function isSignInCancelled(err: unknown): boolean {
  return SIGN_IN_CANCELLED_CODES.has(codeOf(err));
}

export function getSignInErrorMessage(err: unknown): string {
  return SIGN_IN_MESSAGES[codeOf(err)] ?? "Something went wrong signing in. Please try again.";
}

export function getPasswordResetErrorMessage(err: unknown): string {
  const code = codeOf(err);
  if (code === "auth/invalid-email") return "That doesn't look like a valid email address.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait a bit and try again.";
  // Deliberately the same message for auth/user-not-found as any other failure —
  // don't reveal via response shape whether an email has an account.
  return "Could not send reset email. Please check the address and try again.";
}

const ADMIN_MESSAGES: Record<string, string> = {
  "auth/email-already-exists": "An account with that email already exists.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/user-not-found": "No account found for that email.",
};

export function getAdminAuthErrorMessage(err: unknown, fallback: string): string {
  return ADMIN_MESSAGES[codeOf(err)] ?? fallback;
}
