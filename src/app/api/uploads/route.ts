import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const uploadFile = file as File;

  if (!ALLOWED_TYPES.has(uploadFile.type)) {
    return NextResponse.json(
      { error: "Only image files are allowed (JPEG, PNG, WebP, GIF)" },
      { status: 400 },
    );
  }

  if (uploadFile.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB." },
      { status: 400 },
    );
  }

  const ext = uploadFile.name.split(".").pop() || "jpg";
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "vehicles");
  const filePath = path.join(uploadDir, uniqueName);

  await mkdir(uploadDir, { recursive: true });

  const bytes = await uploadFile.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  const url = `/uploads/vehicles/${uniqueName}`;
  return NextResponse.json({ url }, { status: 201 });
}
