import { type NextRequest } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET ?? process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return Response.json({ error: "Image upload not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const upload = new FormData();
  upload.append("file", file);
  upload.append("upload_preset", UPLOAD_PRESET);
  upload.append("folder", "drop/receipts");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: upload,
  });

  if (!res.ok) return Response.json({ error: "Upload failed" }, { status: 500 });

  const data = await res.json();
  return Response.json({ url: data.secure_url });
}
