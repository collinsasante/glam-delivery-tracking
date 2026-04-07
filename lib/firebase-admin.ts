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
    if (!res.ok) {
      const err = (await res.json()) as { error: { message: string } };
      throw new Error(err.error?.message ?? "createUser failed");
    }
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
    if (!res.ok) throw new Error("updateUser failed");
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

  /** Generate a password reset link for a user (used as invite link) */
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
    if (!res.ok) {
      const err = (await res.json()) as { error: { message: string } };
      throw new Error(err.error?.message ?? "generatePasswordResetLink failed");
    }
    const data = (await res.json()) as { oobLink: string };
    return data.oobLink;
  },
};
