
// NextAuth has been removed. Auth is now handled by /api/auth/session.
export function GET() {
  return new Response(null, { status: 404 });
}
export function POST() {
  return new Response(null, { status: 404 });
}
