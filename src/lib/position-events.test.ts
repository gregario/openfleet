import { describe, it, expect, vi, beforeEach } from "vitest";
import { emitPositionUpdates, onPositionUpdates, type PositionUpdate } from "./position-events";

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
  {
    vehicleId: "vehicle-2",
    latitude: 51.46,
    longitude: -2.59,
    speed: 0,
    heading: null,
    motionState: "PARKED",
    timestamp: "2026-04-01T10:00:01Z",
  },
];

describe("position-events", () => {
  it("emitting updates triggers subscriber callback", () => {
    const callback = vi.fn();
    const unsubscribe = onPositionUpdates(callback);

    emitPositionUpdates(sampleUpdates);

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(sampleUpdates);

    unsubscribe();
  });

  it("multiple subscribers all receive updates", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const unsubscribe1 = onPositionUpdates(callback1);
    const unsubscribe2 = onPositionUpdates(callback2);

    emitPositionUpdates(sampleUpdates);

    expect(callback1).toHaveBeenCalledOnce();
    expect(callback2).toHaveBeenCalledOnce();

    unsubscribe1();
    unsubscribe2();
  });

  it("unsubscribe stops receiving updates", () => {
    const callback = vi.fn();
    const unsubscribe = onPositionUpdates(callback);

    unsubscribe();
    emitPositionUpdates(sampleUpdates);

    expect(callback).not.toHaveBeenCalled();
  });

  it("no error when emitting with no subscribers", () => {
    expect(() => emitPositionUpdates(sampleUpdates)).not.toThrow();
  });
});
