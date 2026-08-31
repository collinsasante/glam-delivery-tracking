// Deliberately no `import "server-only"` here (unlike services/*.ts): this module
// is also imported directly by standalone `tsx` migration scripts (scripts/*.ts),
// which run outside Next's bundler where `server-only` throws unconditionally.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing DATABASE_URL env var");
}

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** A db handle that works both as the top-level client and inside `db.transaction(async (tx) => ...)`. */
export type Executor = Database | Transaction;
