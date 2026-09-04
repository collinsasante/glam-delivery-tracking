import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
if (!region) throw new Error("Missing AWS_REGION env var");

export const s3 = new S3Client({
  region,
  // Newer SDK versions compute a request checksum by default, even when
  // presigning — which bakes in the checksum of an EMPTY body (the real file
  // isn't known yet at presign time). The browser's later PUT of the actual
  // file then fails S3's checksum validation. This restores checksums to
  // opt-in only, which is what presigned uploads need.
  requestChecksumCalculation: "WHEN_REQUIRED",
});

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME ?? "";

// The public-facing CDN domain in front of the bucket — a Cloudflare-proxied
// CNAME to the bucket's endpoint (not AWS CloudFront). The bucket must allow
// public s3:GetObject for this to work, since Cloudflare can't sign requests
// the way CloudFront + Origin Access Control does.
export const CDN_DOMAIN = process.env.CDN_DOMAIN ?? "";

export function publicUrlForKey(key: string): string {
  if (!CDN_DOMAIN) throw new Error("Missing CDN_DOMAIN env var");
  return `https://${CDN_DOMAIN}/${key}`;
}
