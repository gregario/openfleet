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

// Magic byte signatures for allowed image types
const MAGIC_BYTES: Array<{ mime: string; ext: string; bytes: number[] }> = [
  { mime: "image/jpeg", ext: "jpg", bytes: [0xFF, 0xD8, 0xFF] },
  { mime: "image/png", ext: "png", bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: "image/gif", ext: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", ext: "webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
];

function detectMimeFromBytes(buffer: ArrayBuffer): { mime: string; ext: string } | null {
  const bytes = new Uint8Array(buffer);
  for (const sig of MAGIC_BYTES) {
    if (sig.bytes.every((b, i) => bytes[i] === b)) {
      return { mime: sig.mime, ext: sig.ext };
    }
  }
  return null;
}

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

  const bytes = await uploadFile.arrayBuffer();

  // Validate magic bytes — do not trust client-provided MIME type alone
  const detected = detectMimeFromBytes(bytes);
  if (!detected || !ALLOWED_TYPES.has(detected.mime)) {
    return NextResponse.json(
      { error: "Only image files are allowed (JPEG, PNG, WebP, GIF)" },
      { status: 400 },
    );
  }

  // Derive extension from validated MIME type, not from filename
  const ext = detected.ext;
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "vehicles");
  const filePath = path.join(uploadDir, uniqueName);

  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  const url = `/uploads/vehicles/${uniqueName}`;
  return NextResponse.json({ url }, { status: 201 });
}
