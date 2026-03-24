export const dynamic = "force-dynamic";

export async function GET() {
  const info = {
    ok: true,
    ts: new Date().toISOString(),
    env: {
      AUTH_SECRET: !!process.env.AUTH_SECRET,
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    },
  };
  console.log("[health] GET /api/health", JSON.stringify(info));
  return Response.json(info);
}
