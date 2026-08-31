import { type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/auth";
import { s3, S3_BUCKET_NAME, publicUrlForKey } from "@/lib/s3";

export const dynamic = "force-dynamic";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!S3_BUCKET_NAME) {
    return Response.json({ error: "Image upload not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const contentType = body?.contentType;
  if (typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    return Response.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const ext = EXT_BY_CONTENT_TYPE[contentType];
  const key = `receipts/${session.user.id}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

  return Response.json({ uploadUrl, publicUrl: publicUrlForKey(key) });
}
