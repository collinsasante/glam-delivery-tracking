import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionPayload } from "@/lib/session";
import { updateRiderFcmToken } from "@/services/riders";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as SessionPayload;
  if (!user.id) return NextResponse.json({ error: "No rider record" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const token = body?.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  await updateRiderFcmToken(user.id, token);
  return NextResponse.json({ ok: true });
}
