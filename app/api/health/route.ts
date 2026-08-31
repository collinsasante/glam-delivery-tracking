export const dynamic = "force-dynamic";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    return Response.json(
      { ok: false, ts: new Date().toISOString(), error: err instanceof Error ? err.message : String(err) },
      { status: 503 }
    );
  }
}
