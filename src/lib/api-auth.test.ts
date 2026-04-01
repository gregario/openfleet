import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// Mock next/navigation to prevent import errors
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock session
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  sessionOptions: {
    password: "dev-only-secret-must-be-at-least-32-chars-long!",
    cookieName: "openfleet-session",
  },
}));

import { getApiSession, isValidApiKey } from "./auth";
import { getSession } from "./session";

// @criterion: gap-api-auth-missing
// @criterion-hash: a3f1c9d82b47
describe("getApiSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session data when user is authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: "user-1",
      role: "ADMIN",
      name: "Admin User",
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    const result = await getApiSession();
    expect(result).toEqual({
      userId: "user-1",
      role: "ADMIN",
      name: "Admin User",
    });
  });

  it("returns null when no session exists", async () => {
    vi.mocked(getSession).mockResolvedValue({
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    const result = await getApiSession();
    expect(result).toBeNull();
  });
});

// @criterion: gap-api-auth-missing
// @criterion-hash: a3f1c9d82b47
describe("isValidApiKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns true when API key matches", () => {
    process.env.POSITION_API_KEY = "test-secret-key";
    const request = new Request("http://localhost/api/positions", {
      headers: { "X-API-Key": "test-secret-key" },
    });
    expect(isValidApiKey(request)).toBe(true);
  });

  it("returns false when API key does not match", () => {
    process.env.POSITION_API_KEY = "test-secret-key";
    const request = new Request("http://localhost/api/positions", {
      headers: { "X-API-Key": "wrong-key" },
    });
    expect(isValidApiKey(request)).toBe(false);
  });

  it("returns false when no API key is configured", () => {
    delete process.env.POSITION_API_KEY;
    const request = new Request("http://localhost/api/positions", {
      headers: { "X-API-Key": "any-key" },
    });
    expect(isValidApiKey(request)).toBe(false);
  });

  it("returns false when no X-API-Key header is provided", () => {
    process.env.POSITION_API_KEY = "test-secret-key";
    const request = new Request("http://localhost/api/positions");
    expect(isValidApiKey(request)).toBe(false);
  });
});
