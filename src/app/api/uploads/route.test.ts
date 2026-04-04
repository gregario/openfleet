import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock session
vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({
    userId: "user-1",
    role: "ADMIN",
    name: "Admin",
    save: vi.fn(),
    destroy: vi.fn(),
    updateConfig: vi.fn(),
  }),
  sessionOptions: {
    password: "dev-only-secret-must-be-at-least-32-chars-long!",
    cookieName: "openfleet-session",
  },
}));

// Mock fs/promises with vi.hoisted
const { mockMkdir, mockWriteFile } = vi.hoisted(() => {
  const mockMkdir = vi.fn().mockResolvedValue(undefined);
  const mockWriteFile = vi.fn().mockResolvedValue(undefined);
  return { mockMkdir, mockWriteFile };
});

vi.mock("fs/promises", () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  default: { mkdir: mockMkdir, writeFile: mockWriteFile },
}));

vi.mock("node:fs/promises", () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  default: { mkdir: mockMkdir, writeFile: mockWriteFile },
}));

import { POST } from "./route";

// Magic byte prefixes for valid image types
const JPEG_MAGIC = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);

// jsdom's File doesn't support arrayBuffer()/text(). Create a mock file
// that behaves like a real File for our route handler.
function createMockFile(content: string, name: string, type: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return {
    name,
    type,
    size: data.byteLength,
    arrayBuffer: () => Promise.resolve(data.buffer),
    text: () => Promise.resolve(content),
    stream: () => new ReadableStream(),
    slice: () => new Blob(),
  };
}

function createMockImageFile(name: string, type: string, magicBytes: Uint8Array = JPEG_MAGIC) {
  return {
    name,
    type,
    size: magicBytes.byteLength,
    arrayBuffer: () => Promise.resolve(magicBytes.buffer.slice(magicBytes.byteOffset, magicBytes.byteOffset + magicBytes.byteLength)),
    text: () => Promise.resolve(""),
    stream: () => new ReadableStream(),
    slice: () => new Blob(),
  };
}

function makeUploadRequest(mockFile: ReturnType<typeof createMockFile> | null): Request {
  const request = new Request("http://localhost/api/uploads", {
    method: "POST",
  });
  // Override formData() to return a mock that provides our file-like object directly
  request.formData = () =>
    Promise.resolve({
      get: (key: string) => (key === "file" ? mockFile : null),
    } as unknown as FormData);
  return request;
}

// @criterion: fa2-vehicle-photo-upload
describe("POST /api/uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a valid image and returns the URL", async () => {
    const file = createMockImageFile("van-photo.jpg", "image/jpeg");
    const request = makeUploadRequest(file);

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.url).toMatch(/^\/uploads\/vehicles\/.+\.jpg$/);
  });

  it("writes file to disk", async () => {
    const file = createMockImageFile("van.png", "image/png", PNG_MAGIC);
    const request = makeUploadRequest(file);

    await POST(request);

    expect(mockMkdir).toHaveBeenCalledWith(
      expect.stringContaining(path.join("public", "uploads", "vehicles")),
      { recursive: true },
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(".png"),
      expect.any(Buffer),
    );
  });

  it("returns 400 when no file is provided", async () => {
    const request = makeUploadRequest(null);

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for non-image file types", async () => {
    const file = createMockFile("not-an-image", "malware.exe", "application/x-msdownload");
    const request = makeUploadRequest(file);

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toMatch(/image/i);
  });

  it("returns 401 when not authenticated", async () => {
    const { getSession } = await import("@/lib/session");
    vi.mocked(getSession).mockResolvedValueOnce({
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    const file = createMockImageFile("photo.jpg", "image/jpeg");
    const request = makeUploadRequest(file);

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("AC-fix-upload-security: rejects file with spoofed MIME type (magic bytes don't match)", async () => {
    // Send a text file with image/jpeg MIME type — magic bytes won't match JPEG
    const file = createMockFile("this is not a jpeg", "fake.jpg", "image/jpeg");
    const request = makeUploadRequest(file);

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toMatch(/image/i);
  });

  it("AC-fix-upload-security: derives extension from validated MIME type, not filename", async () => {
    // Send a valid JPEG with a .exe filename extension
    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const file = {
      name: "malware.exe",
      type: "image/jpeg",
      size: jpegBytes.byteLength,
      arrayBuffer: () => Promise.resolve(jpegBytes.buffer),
      text: () => Promise.resolve(""),
      stream: () => new ReadableStream(),
      slice: () => new Blob(),
    };
    const request = makeUploadRequest(file);

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    // Extension should be .jpg (from validated type), not .exe (from filename)
    expect(body.url).toMatch(/\.jpg$/);
  });

  it("generates a unique filename to prevent collisions", async () => {
    const file = createMockImageFile("photo.jpg", "image/jpeg");

    const res1 = await POST(makeUploadRequest(file));
    const res2 = await POST(makeUploadRequest(file));

    const body1 = await res1.json();
    const body2 = await res2.json();

    expect(body1.url).not.toBe(body2.url);
  });
});
