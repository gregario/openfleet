import { describe, it, expect } from "vitest";
import {
  haversineKm,
  calculateTripDistanceKm,
  isMovingForThreshold,
  isStationaryForThreshold,
  type PositionPoint,
} from "./trips";

const now = new Date("2026-04-05T12:00:00.000Z");
function at(secondsOffset: number): string {
  return new Date(now.getTime() + secondsOffset * 1000).toISOString();
}

function pt(lat: number, lon: number, speed: number, timestamp: string): PositionPoint {
  return { latitude: lat, longitude: lon, speed, timestamp };
}

describe("haversineKm", () => {
  it("returns ~0 km for identical points", () => {
    expect(haversineKm(51.5, -0.1, 51.5, -0.1)).toBeCloseTo(0, 4);
  });

  it("computes distance between London and Paris (~344 km)", () => {
    const d = haversineKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(d).toBeGreaterThan(340);
    expect(d).toBeLessThan(360);
  });

  it("computes ~200m for points ~0.0018 degrees apart", () => {
    // 1 degree lat ≈ 111 km → 0.0018 deg ≈ 200m
    const d = haversineKm(51.5, -0.1, 51.5018, -0.1);
    expect(d).toBeGreaterThan(0.15);
    expect(d).toBeLessThan(0.25);
  });
});

describe("calculateTripDistanceKm", () => {
  it("returns 0 for empty or single-point array", () => {
    expect(calculateTripDistanceKm([])).toBe(0);
    expect(calculateTripDistanceKm([pt(51.5, -0.1, 10, at(0))])).toBe(0);
  });

  it("sums haversine distances between consecutive points", () => {
    const points = [
      pt(51.5, -0.1, 10, at(0)),
      pt(51.51, -0.1, 10, at(60)),   // ~1.11km north
      pt(51.52, -0.1, 10, at(120)),  // ~1.11km north again
    ];
    const d = calculateTripDistanceKm(points);
    expect(d).toBeGreaterThan(2.1);
    expect(d).toBeLessThan(2.3);
  });
});

describe("isMovingForThreshold — trip start detection (speed >5km/h for >30s)", () => {
  it("returns true when all positions in last 30s have speed >5", () => {
    const points = [
      pt(51.5, -0.1, 10, at(0)),
      pt(51.5, -0.1, 12, at(10)),
      pt(51.5, -0.1, 15, at(20)),
      pt(51.5, -0.1, 15, at(31)),
    ];
    expect(isMovingForThreshold(points, 5, 30)).toBe(true);
  });

  it("returns false when positions span less than 30s", () => {
    const points = [
      pt(51.5, -0.1, 10, at(0)),
      pt(51.5, -0.1, 12, at(15)),
    ];
    expect(isMovingForThreshold(points, 5, 30)).toBe(false);
  });

  it("returns false when any position in window is below threshold", () => {
    const points = [
      pt(51.5, -0.1, 10, at(0)),
      pt(51.5, -0.1, 3, at(15)),  // below 5
      pt(51.5, -0.1, 15, at(31)),
    ];
    expect(isMovingForThreshold(points, 5, 30)).toBe(false);
  });
});

describe("isStationaryForThreshold — trip end detection (stationary >3min)", () => {
  it("returns true when all positions in last 3min have speed ~0", () => {
    const points = [
      pt(51.5, -0.1, 0, at(0)),
      pt(51.5, -0.1, 0.2, at(60)),
      pt(51.5, -0.1, 0, at(120)),
      pt(51.5, -0.1, 0.1, at(181)),
    ];
    expect(isStationaryForThreshold(points, 0.5, 180)).toBe(true);
  });

  it("returns false when window is shorter than threshold", () => {
    const points = [
      pt(51.5, -0.1, 0, at(0)),
      pt(51.5, -0.1, 0, at(100)),
    ];
    expect(isStationaryForThreshold(points, 0.5, 180)).toBe(false);
  });

  it("returns false when any position in window shows movement", () => {
    const points = [
      pt(51.5, -0.1, 0, at(0)),
      pt(51.5, -0.1, 8, at(60)),  // moving
      pt(51.5, -0.1, 0, at(181)),
    ];
    expect(isStationaryForThreshold(points, 0.5, 180)).toBe(false);
  });
});
