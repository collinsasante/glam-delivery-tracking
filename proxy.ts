import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "__session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

async function getSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { role?: string };
  } catch {
    return null;
  }
}

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const path = nextUrl.pathname;

  // Public routes — always allow
  if (
    path.startsWith("/track") ||
    path.startsWith("/api/track") ||
    path.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);
  const isLoggedIn = !!session;
  const role = session?.role;

  // Auth pages — redirect if already logged in
  if (path.startsWith("/signin") || path.startsWith("/signup")) {
    if (isLoggedIn) {
      const dest = role === "Admin" ? "/dashboard" : "/rider";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  // All other routes require login
  if (!isLoggedIn) {
    const loginUrl = new URL("/signin", req.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only areas
  const adminPaths = ["/dashboard", "/deliveries", "/riders", "/expenses", "/performance"];
  const isAdminPath = adminPaths.some((p) => path === p || path.startsWith(p + "/"));
  if (isAdminPath && role !== "Admin") {
    return NextResponse.redirect(new URL("/rider", req.url));
  }

  // Rider-only area
  if ((path === "/rider" || path.startsWith("/rider/")) && role !== "Rider") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
