import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/server for NextResponse
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      body,
      headers: init?.headers,
    })),
  },
}));

import { rateLimit, getClientIp, rateLimitResponse } from "./rate-limit";

// @criterion: gap-no-rate-limiting
// @criterion-hash: c5d3e7f12a68
describe("rateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows requests under the limit", () => {
    const result = rateLimit("test-key-1", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks request count within window", () => {
    for (let i = 0; i < 4; i++) {
      rateLimit("test-key-2", 5, 60_000);
    }
    const result = rateLimit("test-key-2", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test-key-3", 5, 60_000);
    }
    const result = rateLimit("test-key-3", 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();

    for (let i = 0; i < 5; i++) {
      rateLimit("test-key-4", 5, 60_000);
    }
    expect(rateLimit("test-key-4", 5, 60_000).allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(61_000);

    const result = rateLimit("test-key-4", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);

    vi.useRealTimers();
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("192.168.1.1");
  });

  it("returns 'unknown' when no forwarded header", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("unknown");
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with Retry-After header", () => {
    const response = rateLimitResponse(60);
    expect(response.status).toBe(429);
    expect(response.headers).toEqual({ "Retry-After": "60" });
  });
});
