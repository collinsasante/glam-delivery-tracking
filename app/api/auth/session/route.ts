import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getRiderByEmail } from "@/services/riders";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);

    const rider = await getRiderByEmail(decoded.email!);

    if (!rider) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }
    if (!rider.active) {
      return NextResponse.json({ error: "Account inactive" }, { status: 403 });
    }

    const token = await createSession({
      id: rider.id,
      name: rider.name,
      email: rider.email,
      role: rider.role,
      riderId: rider.riderId,
    });

    const res = NextResponse.json({ role: rider.role });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("session error:", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
