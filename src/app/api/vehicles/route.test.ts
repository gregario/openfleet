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

import { GET, POST } from "./route";

function setupInsert(data: Record<string, unknown> | null, error: Record<string, unknown> | null = null) {
  const mockSelect = vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data, error: error }),
  });
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ insert: mockInsert });
  return { mockInsert, mockSelect };
}

function setupSelect(data: Record<string, unknown>[] | null, error: Record<string, unknown> | null = null) {
  const mockOrder = vi.fn().mockResolvedValue({ data, error });
  const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
  return { mockSelect, mockOrder };
}

// @criterion: fa2-decommissioned-filter
describe("GET /api/vehicles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all vehicles including DECOMMISSIONED", async () => {
    const vehicles = [
      { id: "v1", name: "Van 1", make: "Ford", model: "Transit", year: 2022, license_plate: "AB12 CDE", color: "White", status: "ACTIVE", odometer: 45000, motion_state: "PARKED", traffic_light: "GREEN", latest_latitude: 51.5, latest_longitude: -0.1 },
      { id: "v2", name: "Van 2", make: "Toyota", model: "HiAce", year: 2020, license_plate: "XY99 ZZZ", color: "Blue", status: "DECOMMISSIONED", odometer: 120000, motion_state: "PARKED", traffic_light: "RED", latest_latitude: null, latest_longitude: null },
    ];
    setupSelect(vehicles);

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.vehicles).toHaveLength(2);
    expect(body.vehicles[1].status).toBe("DECOMMISSIONED");
  });

  it("does not apply server-side .neq filter on status", async () => {
    const vehicles = [
      { id: "v1", name: "Retired Van", make: "Ford", model: "Transit", year: 2018, license_plate: "OLD 001", color: "Grey", status: "DECOMMISSIONED", odometer: 200000, motion_state: "PARKED", traffic_light: "RED", latest_latitude: null, latest_longitude: null },
    ];
    const { mockSelect } = setupSelect(vehicles);

    await GET();

    // The select chain should NOT include a .neq call — only .select().order()
    expect(mockSelect).toHaveBeenCalled();
    // Verify we get the decommissioned vehicle back
    const response = await GET();
    const body = await response.json();
    expect(body.vehicles.some((v: { status: string }) => v.status === "DECOMMISSIONED")).toBe(true);
  });

  it("returns 401 when not authenticated", async () => {
    const { getSession } = await import("@/lib/session");
    vi.mocked(getSession).mockResolvedValueOnce({
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    const response = await GET();
    expect(response.status).toBe(401);
  });
});

// @criterion: fa2-add-vehicle
describe("POST /api/vehicles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validBody = {
    name: "Van 1",
    make: "Ford",
    model: "Transit",
    year: 2022,
    vin: "1FTBW2CM5NKA12345",
    licensePlate: "AB12 CDE",
    color: "White",
    odometer: 45000,
  };

  it("creates a vehicle and returns 201 with the new vehicle", async () => {
    const created = { id: "v-new-1", ...validBody, status: "ACTIVE", traffic_light: "GREEN" };
    setupInsert(created);

    const request = new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.vehicle).toBeDefined();
    expect(body.vehicle.id).toBe("v-new-1");
    expect(body.vehicle.name).toBe("Van 1");
  });

  it("inserts with snake_case column mapping", async () => {
    const created = { id: "v-new-2", ...validBody };
    const { mockInsert } = setupInsert(created);

    const request = new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    await POST(request);

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Van 1",
        make: "Ford",
        model: "Transit",
        year: 2022,
        vin: "1FTBW2CM5NKA12345",
        license_plate: "AB12 CDE",
        color: "White",
        odometer: 45000,
      }),
    ]);
  });

  it("accepts vehicle without optional fields", async () => {
    const minimal = { name: "Van 2", make: "Toyota", model: "HiAce", year: 2023, licensePlate: "XY99 ZZZ" };
    setupInsert({ id: "v-new-3", ...minimal });

    const request = new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(minimal),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("returns 400 for invalid input (missing required fields)", async () => {
    const request = new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Van 1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for invalid VIN", async () => {
    const request = new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validBody, vin: "BAD" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    // Override session to return no user
    const { getSession } = await import("@/lib/session");
    vi.mocked(getSession).mockResolvedValueOnce({
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    const request = new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("AC-fix-post-vehicles-auth: returns 403 when non-ADMIN user creates vehicle", async () => {
    const { getSession } = await import("@/lib/session");
    vi.mocked(getSession).mockResolvedValueOnce({
      userId: "driver-1",
      role: "DRIVER",
      name: "Driver",
      save: vi.fn(),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
    } as never);

    const request = new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("returns 500 when database insert fails", async () => {
    setupInsert(null, { message: "DB error" });

    const request = new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });

  it("stores photoUrl when provided", async () => {
    const withPhoto = { ...validBody, photoUrl: "https://example.com/van.jpg" };
    const { mockInsert } = setupInsert({ id: "v-new-4", ...withPhoto });

    const request = new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withPhoto),
    });

    await POST(request);

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        photo_url: "https://example.com/van.jpg",
      }),
    ]);
  });

  it("sets empty vin/color to null in database", async () => {
    const withEmptyOptionals = { ...validBody, vin: "", color: "" };
    const { mockInsert } = setupInsert({ id: "v-new-5", ...withEmptyOptionals });

    const request = new Request("http://localhost/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withEmptyOptionals),
    });

    await POST(request);

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        vin: null,
        color: null,
      }),
    ]);
  });
});
