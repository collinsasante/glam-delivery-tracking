import { NextResponse } from "next/server";
import { BOARD_COOKIE, boardTokenValid } from "@/lib/board-access";

export const dynamic = "force-dynamic";

/** One-time unlock for an unattended board screen: /board/unlock?key=<BOARD_TOKEN>. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!boardTokenValid(key)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const res = NextResponse.redirect(new URL("/board", url.origin));
  res.cookies.set(BOARD_COOKIE, key!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
