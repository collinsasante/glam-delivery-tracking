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
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return { user: payload as unknown as SessionPayload };
  } catch {
    return null;
  }
}
