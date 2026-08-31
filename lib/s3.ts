import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
if (!region) throw new Error("Missing AWS_REGION env var");

export const s3 = new S3Client({ region });

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME ?? "";
export const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN ?? "";

export function publicUrlForKey(key: string): string {
  if (!CLOUDFRONT_DOMAIN) throw new Error("Missing CLOUDFRONT_DOMAIN env var");
  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}
