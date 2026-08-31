import "server-only";
import { createRemoteJWKSet, jwtVerify, SignJWT, importPKCS8 } from "jose";

// Verify Firebase ID tokens using Google's public JWKS — no firebase-admin needed
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com"
  )
);

function projectId(): string {
  return process.env.FIREBASE_PROJECT_ID!;
}

/** Exchange service account credentials for a Google OAuth2 access token */
async function getServiceAccountToken(): Promise<string> {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKeyPem = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);

  const privateKey = await importPKCS8(privateKeyPem, "RS256");

  const assertion = await new SignJWT({
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    scope:
      "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform",
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(privateKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) throw new Error("Failed to obtain service account token");
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function adminUrl(path: string): string {
  return `https://identitytoolkit.googleapis.com/v1/projects/${projectId()}/accounts${path}`;
}

/** Normalizes Identity Toolkit's raw error strings (e.g. "WEAK_PASSWORD : ...")
 *  into the same "auth/xxx" shape the client SDK uses, so callers can share
 *  one error-message mapping (see lib/auth-errors.ts) regardless of which
 *  Firebase surface threw. */
function toAuthErrorCode(rawMessage: string): string {
  const key = rawMessage.split(":")[0].trim();
  const known: Record<string, string> = {
    EMAIL_EXISTS: "auth/email-already-exists",
    INVALID_EMAIL: "auth/invalid-email",
    WEAK_PASSWORD: "auth/weak-password",
    EMAIL_NOT_FOUND: "auth/user-not-found",
  };
  return known[key] ?? "auth/unknown";
}

async function throwAdminError(res: Response, fallbackMessage: string): Promise<never> {
  const err = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
  const rawMessage = err?.error?.message ?? fallbackMessage;
  throw Object.assign(new Error(rawMessage), { code: toAuthErrorCode(rawMessage) });
}

export const adminAuth = {
  /** Verify a Firebase ID token using jose + Google JWKS */
  async verifyIdToken(idToken: string): Promise<{ uid: string; email: string }> {
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId()}`,
      audience: projectId(),
    });
    return { uid: payload.sub as string, email: payload["email"] as string };
  },

  /** Create a Firebase Auth user */
  async createUser(props: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<{ uid: string }> {
    const token = await getServiceAccountToken();
    const res = await fetch(adminUrl(""), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email: props.email,
        password: props.password,
        displayName: props.displayName,
      }),
    });
    if (!res.ok) return throwAdminError(res, "createUser failed");
    const data = (await res.json()) as { localId: string };
    return { uid: data.localId };
  },

  /** Look up a Firebase Auth user by email */
  async getUserByEmail(email: string): Promise<{ uid: string; email: string }> {
    const token = await getServiceAccountToken();
    const res = await fetch(adminUrl(":lookup"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: [email] }),
    });
    const data = (await res.json()) as {
      users?: Array<{ localId: string; email: string }>;
    };
    const user = data.users?.[0];
    if (!user) {
      throw Object.assign(new Error("USER_NOT_FOUND"), { code: "auth/user-not-found" });
    }
    return { uid: user.localId, email: user.email };
  },

  /** Update a Firebase Auth user (e.g. reset password) */
  async updateUser(uid: string, props: { password?: string; displayName?: string }): Promise<void> {
    const token = await getServiceAccountToken();
    const res = await fetch(adminUrl(":update"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ localId: uid, ...props }),
    });
    if (!res.ok) return throwAdminError(res, "updateUser failed");
  },

  /** Delete a Firebase Auth user */
  async deleteUser(uid: string): Promise<void> {
    const token = await getServiceAccountToken();
    const res = await fetch(adminUrl(":delete"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ localId: uid }),
    });
    if (!res.ok) throw new Error("deleteUser failed");
  },

  /** Send a password reset email via Firebase (Firebase handles delivery — no Resend needed) */
  async sendPasswordResetEmail(email: string): Promise<void> {
    const token = await getServiceAccountToken();
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId()}/accounts:sendOobCode`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
      }
    );
    if (!res.ok) return throwAdminError(res, "sendPasswordResetEmail failed");
  },

  /** Generate a password reset link (used when sending branded invite emails via Resend) */
  async generatePasswordResetLink(email: string): Promise<string> {
    const token = await getServiceAccountToken();
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId()}/accounts:sendOobCode`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email, returnOobLink: true }),
      }
    );
    if (!res.ok) return throwAdminError(res, "generatePasswordResetLink failed");
    const data = (await res.json()) as { oobLink: string };
    return data.oobLink;
  },
};
