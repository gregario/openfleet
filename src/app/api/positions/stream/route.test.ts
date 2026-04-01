import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the position-events module before importing the route
vi.mock("@/lib/position-events", () => ({
  onPositionUpdates: vi.fn(),
}));

import { GET } from "./route";
import { onPositionUpdates } from "@/lib/position-events";
import type { PositionUpdate } from "@/lib/position-events";

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

describe("GET /api/positions/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: onPositionUpdates returns a no-op unsubscribe
    vi.mocked(onPositionUpdates).mockReturnValue(() => {});
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
