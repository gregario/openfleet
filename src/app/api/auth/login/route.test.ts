import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock session
vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({
    save: vi.fn(),
    destroy: vi.fn(),
    updateConfig: vi.fn(),
  }),
  sessionOptions: {
    password: "dev-only-secret-must-be-at-least-32-chars-long!",
    cookieName: "openfleet-session",
  },
}));

// Mock supabase — use vi.hoisted to make variables available in factory
const { mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
  return { mockFrom, mockSelect, mockEq, mockSingle };
});

vi.mock("@/lib/db", () => ({
  supabase: { from: mockFrom },
}));

// Mock auth
vi.mock("@/lib/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...mod,
    verifyPassword: vi.fn(),
  };
});

import { POST } from "./route";
import { verifyPassword } from "@/lib/auth";
import { supabase } from "@/lib/db";

function setupUserQuery(data: Record<string, unknown> | null, error: Record<string, unknown> | null = null) {
  const mockSingle = vi.fn().mockResolvedValue({ data, error });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
  return { mockSelect, mockEq, mockSingle };
}

// @criterion: gap-login-password-hash-exposure
// @criterion-hash: b4e2d8a91c53
describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses explicit column selection instead of select('*')", async () => {
    const { mockSelect } = setupUserQuery({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin",
      role: "ADMIN",
      password_hash: "$2a$12$hash",
    });
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test.com", password: "test123" }),
    });

    await POST(request);

    // Verify that select was called with explicit columns, NOT '*'
    expect(mockSelect).toHaveBeenCalledWith("id, email, name, role, password_hash");
    expect(mockSelect).not.toHaveBeenCalledWith("*");
  });

  it("returns user data without password_hash in response", async () => {
    setupUserQuery({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin",
      role: "ADMIN",
      password_hash: "$2a$12$hash",
    });
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test.com", password: "test123" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(body).toEqual({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin",
      role: "ADMIN",
    });
    expect(body).not.toHaveProperty("password_hash");
  });

  it("returns 401 for invalid credentials", async () => {
    setupUserQuery(null, { message: "Not found" });

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bad@test.com", password: "wrong" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid input", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
