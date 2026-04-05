import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock session (admin by default)
vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({
    userId: "admin-1",
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

// Mock position-events to avoid SSE side effects
vi.mock("@/lib/position-events", () => ({
  emitPositionUpdates: vi.fn(),
}));

// Mock supabase — chainable, dispatches on table name
const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});

vi.mock("@/lib/db", () => ({
  supabase: { from: mockFrom },
  prisma: {},
}));

import { POST } from "./route";

interface VehicleRow { id: string }

/**
 * Configure supabase mock for the positions POST flow:
 *  - vehicles.select().in().eq() → returns existingVehicles
 *  - positions.insert() → returns { error: insertError }
 *  - vehicles.update().eq() → returns success
 */
function setupPositionInsert(
  existingVehicles: VehicleRow[] | null,
  opts: { vehicleQueryError?: { message: string } | null; insertError?: { message: string } | null } = {},
) {
  const vehicleQueryError = opts.vehicleQueryError ?? null;
  const insertError = opts.insertError ?? null;

  const insertFn = vi.fn().mockResolvedValue({ error: insertError });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

  const vehicleEq = vi
    .fn()
    .mockResolvedValue({ data: existingVehicles, error: vehicleQueryError });
  const vehicleIn = vi.fn().mockReturnValue({ eq: vehicleEq });
  const vehicleSelect = vi.fn().mockReturnValue({ in: vehicleIn });

  // Trip detection queries against "trips" and "positions" tables —
  // return empty results so processPositionForTrips no-ops.
  const tripMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const tripActiveEq = vi.fn().mockReturnValue({ maybeSingle: tripMaybeSingle });
  const tripVehicleEq = vi.fn().mockReturnValue({ eq: tripActiveEq });
  const tripSelect = vi.fn().mockReturnValue({ eq: tripVehicleEq });

  const positionOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  const positionGte = vi.fn().mockReturnValue({ order: positionOrder });
  const positionEq = vi.fn().mockReturnValue({ gte: positionGte });
  const positionSelect = vi.fn().mockReturnValue({ eq: positionEq });

  mockFrom.mockImplementation((table: string) => {
    if (table === "vehicles") {
      return { select: vehicleSelect, update: updateFn };
    }
    if (table === "positions") {
      // insert path used by POST, select/eq/gte/order path used by trip detection
      return { insert: insertFn, select: positionSelect };
    }
    if (table === "trips") {
      return { select: tripSelect };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { insertFn, updateFn, updateEq, vehicleSelect };
}

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/positions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1", ...headers },
    body: JSON.stringify(body),
  });
}

const validPosition = {
  vehicle_id: "v1",
  latitude: 51.5074,
  longitude: -0.1278,
  speed: 25.4,
  heading: 180,
  timestamp: "2026-04-05T10:30:00.000Z",
};

describe("POST /api/positions — GPS ingestion REST API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @criterion: gps-api-accepts-core-fields
  it("accepts a valid single position payload with vehicle_id/lat/lon/speed/heading/timestamp", async () => {
    setupPositionInsert([{ id: "v1" }]);

    const response = await POST(
      makeRequest({ ...validPosition, vehicle_id: 'v1' }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.accepted).toBe(1);
    expect(body.rejected).toBe(0);
  });

  // @criterion: gps-api-stores-positions
  it("inserts position into positions table with snake_case column mapping", async () => {
    const { insertFn } = setupPositionInsert([{ id: "v1" }]);

    await POST(makeRequest({ ...validPosition, vehicle_id: 'v1' }));

    expect(insertFn).toHaveBeenCalledWith([
      expect.objectContaining({
        vehicle_id: expect.any(String),
        latitude: 51.5074,
        longitude: -0.1278,
        speed: 25.4,
        heading: 180,
        timestamp: expect.any(String),
      }),
    ]);
  });

  // @criterion: gps-api-batch-support
  it("accepts a batch array of positions", async () => {
    setupPositionInsert([{ id: "v1" }, { id: "v2" }]);

    const response = await POST(
      makeRequest([
        { ...validPosition, vehicle_id: 'v1' },
        { ...validPosition, vehicle_id: 'v1', latitude: 53.4, longitude: -2.2 },
      ]),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.accepted).toBe(2);
  });

  // @criterion: gps-api-auth-required
  it("returns 401 when not authenticated and no API key", async () => {
    const { getSession } = await import("@/lib/session");
    vi.mocked(getSession).mockResolvedValueOnce({
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    const response = await POST(
      makeRequest({ ...validPosition, vehicle_id: 'v1' }),
    );
    expect(response.status).toBe(401);
  });

  // @criterion: gps-api-api-key-auth
  it("accepts valid API key header (simulator auth)", async () => {
    process.env.POSITION_API_KEY = "test-key-12345";
    const { getSession } = await import("@/lib/session");
    vi.mocked(getSession).mockResolvedValueOnce({
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    setupPositionInsert([{ id: "v1" }]);

    const response = await POST(
      makeRequest(
        { ...validPosition, vehicle_id: 'v1' },
        { "X-API-Key": "test-key-12345" },
      ),
    );

    expect(response.status).toBe(200);
    delete process.env.POSITION_API_KEY;
  });

  // @criterion: gps-api-rejects-invalid-input
  it("returns 400 for invalid coordinates (lat out of range)", async () => {
    const response = await POST(
      makeRequest({ ...validPosition, vehicle_id: 'v1', latitude: 200 }),
    );
    expect(response.status).toBe(400);
  });

  // @criterion: gps-api-rejects-unknown-vehicle
  it("returns 404 when vehicle_id does not exist", async () => {
    setupPositionInsert([]); // no matching vehicles

    const response = await POST(
      makeRequest({ ...validPosition, vehicle_id: 'v1' }),
    );
    expect(response.status).toBe(404);
  });

  // @criterion: gps-api-updates-vehicle-motion-state
  it("updates vehicle motion_state and latest position fields after insert", async () => {
    const { updateFn } = setupPositionInsert([{ id: "v1" }]);

    await POST(
      makeRequest({ ...validPosition, vehicle_id: 'v1', speed: 30 }),
    );

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        motion_state: "MOVING",
        latest_latitude: 51.5074,
        latest_longitude: -0.1278,
        latest_speed: 30,
      }),
    );
  });
});
