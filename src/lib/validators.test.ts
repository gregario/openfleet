import { describe, it, expect } from "vitest";
import { positionSchema, positionBatchSchema, loginSchema, createVehicleSchema } from "./validators";

describe("positionSchema", () => {
  const validPosition = {
    vehicle_id: "clx123abc",
    latitude: 51.4545,
    longitude: -2.5879,
    speed: 35.2,
    heading: 180,
    timestamp: "2026-04-01T10:00:00Z",
  };

  it("accepts a valid position", () => {
    const result = positionSchema.safeParse(validPosition);
    expect(result.success).toBe(true);
  });

  it("accepts position without optional speed and heading", () => {
    const { speed, heading, ...minimal } = validPosition;
    const result = positionSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("rejects latitude out of range", () => {
    const result = positionSchema.safeParse({ ...validPosition, latitude: 91 });
    expect(result.success).toBe(false);
  });

  it("rejects latitude below range", () => {
    const result = positionSchema.safeParse({ ...validPosition, latitude: -91 });
    expect(result.success).toBe(false);
  });

  it("rejects longitude out of range", () => {
    const result = positionSchema.safeParse({ ...validPosition, longitude: 181 });
    expect(result.success).toBe(false);
  });

  it("rejects negative speed", () => {
    const result = positionSchema.safeParse({ ...validPosition, speed: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects heading above 360", () => {
    const result = positionSchema.safeParse({ ...validPosition, heading: 361 });
    expect(result.success).toBe(false);
  });

  it("rejects missing vehicle_id", () => {
    const { vehicle_id, ...noId } = validPosition;
    const result = positionSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it("rejects empty vehicle_id", () => {
    const result = positionSchema.safeParse({ ...validPosition, vehicle_id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid timestamp format", () => {
    const result = positionSchema.safeParse({ ...validPosition, timestamp: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("positionBatchSchema", () => {
  const validPosition = {
    vehicle_id: "clx123abc",
    latitude: 51.4545,
    longitude: -2.5879,
    timestamp: "2026-04-01T10:00:00Z",
  };

  it("accepts a single position object", () => {
    const result = positionBatchSchema.safeParse(validPosition);
    expect(result.success).toBe(true);
  });

  it("accepts an array of positions", () => {
    const result = positionBatchSchema.safeParse([validPosition, { ...validPosition, latitude: 51.46 }]);
    expect(result.success).toBe(true);
  });

  it("rejects array with invalid position", () => {
    const result = positionBatchSchema.safeParse([validPosition, { latitude: 999 }]);
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({ email: "admin@openfleet.local", password: "secret123" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "admin@openfleet.local", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("createVehicleSchema", () => {
  const validVehicle = {
    name: "Van 1",
    make: "Ford",
    model: "Transit",
    year: 2022,
    vin: "1FTBW2CM5NKA12345",
    licensePlate: "AB12 CDE",
    color: "White",
    odometer: 45000,
  };

  it("accepts a valid vehicle with all fields", () => {
    const result = createVehicleSchema.safeParse(validVehicle);
    expect(result.success).toBe(true);
  });

  it("accepts a vehicle without optional fields (vin, color, photoUrl)", () => {
    const { vin, color, ...minimal } = validVehicle;
    const result = createVehicleSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("defaults odometer to 0 when omitted", () => {
    const { odometer, ...noOdometer } = validVehicle;
    const result = createVehicleSchema.safeParse(noOdometer);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.odometer).toBe(0);
    }
  });

  it("rejects empty name", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty make", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, make: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty model", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, model: "" });
    expect(result.success).toBe(false);
  });

  it("rejects year before 1900", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, year: 1899 });
    expect(result.success).toBe(false);
  });

  it("rejects year more than 2 ahead of current", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, year: new Date().getFullYear() + 3 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid VIN (wrong length)", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, vin: "ABC123" });
    expect(result.success).toBe(false);
  });

  it("rejects VIN with invalid characters (I, O, Q)", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, vin: "1FTBW2CM5IKA12345" });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for vin (treated as not provided)", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, vin: "" });
    expect(result.success).toBe(true);
  });

  it("rejects empty licensePlate", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, licensePlate: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative odometer", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, odometer: -100 });
    expect(result.success).toBe(false);
  });

  it("accepts a valid photoUrl", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, photoUrl: "https://example.com/photo.jpg" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid photoUrl", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, photoUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts empty string for photoUrl (treated as not provided)", () => {
    const result = createVehicleSchema.safeParse({ ...validVehicle, photoUrl: "" });
    expect(result.success).toBe(true);
  });
});
