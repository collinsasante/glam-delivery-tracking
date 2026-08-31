/**
 * One-time migration: copy existing Cloudinary / Airtable-attachment image URLs
 * into S3 and rewrite the corresponding DB columns to the new CloudFront URL.
 *
 * Run AFTER scripts/migrate-to-postgres.ts has loaded the old URLs as-is (or via
 * `npm run migrate:images`):
 *   DOTENV_CONFIG_PATH=.env.local node --conditions=react-server --import tsx -r dotenv/config scripts/migrate-images-to-s3.ts
 *
 * Requires DATABASE_URL, AWS_REGION, S3_BUCKET_NAME, CLOUDFRONT_DOMAIN.
 * (dotenv is preloaded via `-r`, not a same-file import — see the note in
 * scripts/migrate-to-postgres.ts for why that matters under ESM.)
 *
 * Airtable attachment URLs (*.airtableusercontent.com) are prioritized and
 * treated as expected-to-sometimes-fail (they rotate/expire) — failures are
 * collected into a "needs manual re-upload" report rather than aborting the run.
 */
import { like, or, eq } from "drizzle-orm";
import { writeFileSync } from "node:fs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../lib/db/client";
import { riders, expenses } from "../lib/db/schema";
import { s3, S3_BUCKET_NAME, publicUrlForKey } from "../lib/s3";

const CONCURRENCY = 6;

interface Failure {
  table: "riders" | "expenses";
  id: number;
  url: string;
  error: string;
}

async function runBatched<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

function contentTypeFromUrl(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

async function migrateOne(
  table: "riders" | "expenses",
  id: number,
  sourceUrl: string,
  keyPrefix: string,
  failures: Failure[]
): Promise<void> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || contentTypeFromUrl(sourceUrl);
    const ext = contentType.split("/")[1] || "jpg";
    const key = `${keyPrefix}/${id}.${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const newUrl = publicUrlForKey(key);
    if (table === "riders") {
      await db.update(riders).set({ photoUrl: newUrl }).where(eq(riders.id, id));
    } else {
      await db.update(expenses).set({ receiptUrl: newUrl }).where(eq(expenses.id, id));
    }
    console.log(`  OK  ${table}#${id} -> ${key}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`  FAIL ${table}#${id} (${sourceUrl}): ${message}`);
    failures.push({ table, id, url: sourceUrl, error: message });
  }
}

async function main() {
  if (!S3_BUCKET_NAME) throw new Error("Missing S3_BUCKET_NAME env var");
  const failures: Failure[] = [];

  console.log("=== Rider photos (Airtable attachment URLs first — expect some to have expired) ===");
  const riderRows = await db
    .select({ id: riders.id, photoUrl: riders.photoUrl })
    .from(riders)
    .where(
      or(
        like(riders.photoUrl, "%airtableusercontent.com%"),
        like(riders.photoUrl, "%cloudinary.com%")
      )
    );
  console.log(`Found ${riderRows.length} rider photos to migrate.`);
  await runBatched(riderRows, CONCURRENCY, async (row) => {
    if (!row.photoUrl) return;
    await migrateOne("riders", row.id, row.photoUrl, "riders", failures);
  });

  console.log("\n=== Expense receipts (Cloudinary URLs) ===");
  const expenseRows = await db
    .select({ id: expenses.id, receiptUrl: expenses.receiptUrl })
    .from(expenses)
    .where(
      or(
        like(expenses.receiptUrl, "%cloudinary.com%"),
        like(expenses.receiptUrl, "%airtableusercontent.com%")
      )
    );
  console.log(`Found ${expenseRows.length} expense receipts to migrate.`);
  await runBatched(expenseRows, CONCURRENCY, async (row) => {
    if (!row.receiptUrl) return;
    await migrateOne("expenses", row.id, row.receiptUrl, "receipts", failures);
  });

  const reportPath = `image-migration-report.${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(reportPath, JSON.stringify({ failures }, null, 2));

  console.log(`\n=== Done ===`);
  console.log(`${failures.length} failure(s) — see ${reportPath} for URLs needing manual re-upload.`);
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("IMAGE MIGRATION FAILED:", err);
  process.exit(1);
});
