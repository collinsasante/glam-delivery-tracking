import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "__session";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export interface SessionPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  riderId: string;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function getSession(): Promise<{ user: SessionPayload } | null> {
  console.log("[session] getSession called, AUTH_SECRET set:", !!process.env.AUTH_SECRET);
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    console.log("[session] no session cookie found");
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    console.log("[session] session verified, role:", (payload as SessionPayload).role);
    return { user: payload as unknown as SessionPayload };
  } catch (e) {
    console.log("[session] jwtVerify failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
