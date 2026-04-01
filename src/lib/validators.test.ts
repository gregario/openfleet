import { describe, it, expect } from "vitest";
import { positionSchema, positionBatchSchema, loginSchema } from "./validators";

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
