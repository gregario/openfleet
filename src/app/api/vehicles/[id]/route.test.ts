import { describe, it, expect, vi, beforeEach } from "vitest";

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

// Mock supabase
const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});

vi.mock("@/lib/db", () => ({
  supabase: { from: mockFrom },
}));

import { GET, PUT } from "./route";

function setupSelect(data: Record<string, unknown> | null, error: Record<string, unknown> | null = null) {
  const mockSingle = vi.fn().mockResolvedValue({ data, error });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
  return { mockSelect, mockEq, mockSingle };
}

function setupUpdate(data: Record<string, unknown> | null, error: Record<string, unknown> | null = null) {
  const mockSingle = vi.fn().mockResolvedValue({ data, error });
  const mockUpdateEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
  mockFrom.mockReturnValue({ update: mockUpdate });
  return { mockUpdate, mockUpdateEq, mockSingle };
}

const sampleVehicle = {
  id: "v-1",
  name: "Van Alpha",
  make: "Ford",
  model: "Transit",
  year: 2022,
  vin: "1FTBW2CM5NKA12345",
  license_plate: "AB12 CDE",
  color: "White",
  photo_url: null,
  status: "ACTIVE",
  odometer: 45000,
  motion_state: "PARKED",
  traffic_light: "GREEN",
  latest_latitude: 51.4545,
  latest_longitude: -2.5879,
  latest_speed: 0,
  latest_heading: 90,
  latest_position_at: "2026-04-03T10:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-04-03T10:00:00Z",
};

function makeRequest(id: string) {
  return new Request(`http://localhost/api/vehicles/${id}`);
}

// @criterion: fa2-vehicle-detail
describe("GET /api/vehicles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a vehicle with camelCase fields", async () => {
    setupSelect(sampleVehicle);

    const response = await GET(makeRequest("v-1"), { params: Promise.resolve({ id: "v-1" }) });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.vehicle.id).toBe("v-1");
    expect(body.vehicle.name).toBe("Van Alpha");
    expect(body.vehicle.licensePlate).toBe("AB12 CDE");
    expect(body.vehicle.trafficLight).toBe("GREEN");
    expect(body.vehicle.motionState).toBe("PARKED");
    expect(body.vehicle.odometer).toBe(45000);
    expect(body.vehicle.latestPosition).toEqual({
      latitude: 51.4545,
      longitude: -2.5879,
      speed: 0,
      heading: 90,
      timestamp: "2026-04-03T10:00:00Z",
    });
  });

  it("returns null latestPosition when no coordinates", async () => {
    setupSelect({ ...sampleVehicle, latest_latitude: null, latest_longitude: null });

    const response = await GET(makeRequest("v-1"), { params: Promise.resolve({ id: "v-1" }) });
    const body = await response.json();
    expect(body.vehicle.latestPosition).toBeNull();
  });

  it("returns 404 when vehicle not found", async () => {
    setupSelect(null, { code: "PGRST116", message: "not found" });

    const response = await GET(makeRequest("nonexistent"), { params: Promise.resolve({ id: "nonexistent" }) });
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe("Vehicle not found");
  });

  it("returns 401 when not authenticated", async () => {
    const { getSession } = await import("@/lib/session");
    vi.mocked(getSession).mockResolvedValueOnce({
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    const response = await GET(makeRequest("v-1"), { params: Promise.resolve({ id: "v-1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 500 on database error", async () => {
    setupSelect(null, { message: "DB error" });

    const response = await GET(makeRequest("v-1"), { params: Promise.resolve({ id: "v-1" }) });
    expect(response.status).toBe(500);
  });
});

// @criterion: AC-fix-vehicle-edit-3 — PUT /api/vehicles/[id] persists updates with Zod validation
describe("PUT /api/vehicles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a vehicle and returns the updated record", async () => {
    const updatedRow = { ...sampleVehicle, name: "Van Beta", status: "IN_SHOP" };
    setupUpdate(updatedRow);

    const request = new Request("http://localhost/api/vehicles/v-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Van Beta", status: "IN_SHOP" }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "v-1" }) });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.vehicle.name).toBe("Van Beta");
    expect(body.vehicle.status).toBe("IN_SHOP");
  });

  it("validates input with Zod and returns 400 on invalid data", async () => {
    const request = new Request("http://localhost/api/vehicles/v-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: 1800 }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "v-1" }) });
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 401 when not authenticated", async () => {
    const { getSession } = await import("@/lib/session");
    vi.mocked(getSession).mockResolvedValueOnce({
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    const request = new Request("http://localhost/api/vehicles/v-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Van Beta" }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "v-1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 404 when vehicle not found", async () => {
    setupUpdate(null, { code: "PGRST116", message: "not found" });

    const request = new Request("http://localhost/api/vehicles/v-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Van Beta" }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "v-1" }) });
    expect(response.status).toBe(404);
  });

  it("accepts status values: ACTIVE, IN_SHOP, DECOMMISSIONED", async () => {
    for (const status of ["ACTIVE", "IN_SHOP", "DECOMMISSIONED"]) {
      vi.clearAllMocks();
      const updatedRow = { ...sampleVehicle, status };
      setupUpdate(updatedRow);

      const request = new Request("http://localhost/api/vehicles/v-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: "v-1" }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.vehicle.status).toBe(status);
    }
  });

  it("rejects invalid status values", async () => {
    const request = new Request("http://localhost/api/vehicles/v-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INVALID_STATUS" }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "v-1" }) });
    expect(response.status).toBe(400);
  });
});
