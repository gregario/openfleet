import { describe, it, expect, vi, beforeEach } from "vitest";

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

// Mock the position-events module before importing the route
vi.mock("@/lib/position-events", () => ({
  onPositionUpdates: vi.fn(),
}));

import { GET } from "./route";
import { onPositionUpdates } from "@/lib/position-events";
import type { PositionUpdate } from "@/lib/position-events";
import { getSession } from "@/lib/session";

const sampleUpdates: PositionUpdate[] = [
  {
    vehicleId: "vehicle-1",
    latitude: 51.4545,
    longitude: -2.5879,
    speed: 35.2,
    heading: 180,
    motionState: "MOVING",
    timestamp: "2026-04-01T10:00:00Z",
  },
];

function makeRequest() {
  // jsdom's AbortSignal and the undici/global AbortSignal may differ; build a
  // minimal Request-compatible mock to avoid the instanceof mismatch in tests.
  const controller = new AbortController();
  const req = {
    signal: controller.signal,
  } as unknown as Request;
  return { req, controller };
}

// @criterion: fa1-realtime-004
// @criterion-hash: 7116d7554b27
describe("GET /api/positions/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated admin session
    vi.mocked(getSession).mockResolvedValue({
      userId: "user-1",
      role: "ADMIN",
      name: "Admin",
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);
    // Default: onPositionUpdates returns a no-op unsubscribe
    vi.mocked(onPositionUpdates).mockReturnValue(() => {});
  });

  // @criterion: gap-api-auth-missing
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue({
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    const { req: request } = makeRequest();
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns correct SSE headers", async () => {
    const { req: request } = makeRequest();
    const response = await GET(request);

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(response.headers.get("Connection")).toBe("keep-alive");
  });

  it("streams position updates as SSE data events", async () => {
    // Capture the callback registered by the route
    let registeredCallback: ((updates: PositionUpdate[]) => void) | null = null;
    vi.mocked(onPositionUpdates).mockImplementation((cb) => {
      registeredCallback = cb;
      return () => {};
    });

    const { req: request } = makeRequest();
    const response = await GET(request);

    expect(response.body).toBeTruthy();
    expect(registeredCallback).not.toBeNull();

    // Read chunks from the stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    // Emit position updates through the registered callback
    registeredCallback!(sampleUpdates);

    const { value } = await reader.read();
    const chunk = decoder.decode(value);

    const expectedPayload = JSON.stringify({ vehicles: sampleUpdates });
    expect(chunk).toContain(`data: ${expectedPayload}\n\n`);

    reader.cancel();
  });
});
