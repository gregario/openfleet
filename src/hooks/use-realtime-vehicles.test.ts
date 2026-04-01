import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeVehicles, type PositionUpdate } from './use-realtime-vehicles';
import type { VehicleWithPosition } from '@/lib/vehicles';

// ---------------------------------------------------------------------------
// MockEventSource — simulates the browser EventSource API
// ---------------------------------------------------------------------------
class MockEventSource {
  static instances: MockEventSource[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  /** Helper: push a server-sent message into the hook (matches real server format) */
  simulateMessage(updates: PositionUpdate[]) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ vehicles: updates }) }));
  }
}

vi.stubGlobal('EventSource', vi.fn((url: string) => new MockEventSource(url)));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const baseVehicles: VehicleWithPosition[] = [
  {
    id: 'v1',
    name: 'Van 1',
    trafficLight: 'GREEN',
    motionState: 'MOVING',
    licensePlate: 'WR71 HJK',
    driverName: 'James Cooper',
    latestPosition: { latitude: 51.45, longitude: -2.59 },
  },
  {
    id: 'v2',
    name: 'Van 2',
    trafficLight: 'RED',
    motionState: 'PARKED',
    licensePlate: 'WR72 ABC',
    driverName: null,
    latestPosition: null,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
// @criterion: fa1-realtime-004
// @criterion-hash: 7116d7554b27
describe('useRealtimeVehicles', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial vehicles when no SSE updates arrive', () => {
    const { result } = renderHook(() => useRealtimeVehicles(baseVehicles));
    expect(result.current).toEqual(baseVehicles);
  });

  it('merges a position update into the correct vehicle', () => {
    const { result } = renderHook(() => useRealtimeVehicles(baseVehicles));

    const update: PositionUpdate = {
      vehicleId: 'v1',
      latitude: 51.46,
      longitude: -2.60,
      speed: 42,
      heading: 90,
      motionState: 'MOVING',
      timestamp: '2026-04-01T12:00:00Z',
    };

    act(() => {
      MockEventSource.instances[0].simulateMessage([update]);
    });

    const v1 = result.current.find((v) => v.id === 'v1')!;
    expect(v1.latestPosition).toEqual({
      latitude: 51.46,
      longitude: -2.60,
      speed: 42,
      heading: 90,
      timestamp: '2026-04-01T12:00:00Z',
    });
    // v2 must be untouched
    expect(result.current.find((v) => v.id === 'v2')).toEqual(baseVehicles[1]);
  });

  it('updates motionState from position update', () => {
    const { result } = renderHook(() => useRealtimeVehicles(baseVehicles));

    const update: PositionUpdate = {
      vehicleId: 'v1',
      latitude: 51.45,
      longitude: -2.59,
      speed: 0,
      heading: null,
      motionState: 'IDLE',
      timestamp: '2026-04-01T12:01:00Z',
    };

    act(() => {
      MockEventSource.instances[0].simulateMessage([update]);
    });

    expect(result.current.find((v) => v.id === 'v1')!.motionState).toBe('IDLE');
  });

  it('ignores updates for unknown vehicle IDs', () => {
    const { result } = renderHook(() => useRealtimeVehicles(baseVehicles));

    const update: PositionUpdate = {
      vehicleId: 'unknown-id',
      latitude: 99,
      longitude: 99,
      speed: 10,
      heading: 0,
      motionState: 'MOVING',
      timestamp: '2026-04-01T12:02:00Z',
    };

    act(() => {
      MockEventSource.instances[0].simulateMessage([update]);
    });

    // State must be identical to initial — deep equality
    expect(result.current).toEqual(baseVehicles);
  });

  it('AC-fa1-json-safety-001: does not crash on malformed SSE data', () => {
    const { result } = renderHook(() => useRealtimeVehicles(baseVehicles));

    // Send malformed JSON — should not throw or change state
    act(() => {
      const es = MockEventSource.instances[0];
      es.onmessage?.(new MessageEvent('message', { data: 'not-valid-json' }));
    });

    // Vehicles should remain unchanged
    expect(result.current).toEqual(baseVehicles);
  });

  it('REGRESSION: fix-qa-sse-mismatch — unwraps {vehicles:[...]} envelope from server', () => {
    const { result } = renderHook(() => useRealtimeVehicles(baseVehicles));

    const update: PositionUpdate = {
      vehicleId: 'v1',
      latitude: 51.47,
      longitude: -2.61,
      speed: 30,
      heading: 45,
      motionState: 'MOVING',
      timestamp: '2026-04-01T12:05:00Z',
    };

    // Directly send the raw server format to verify the hook unwraps it
    act(() => {
      const es = MockEventSource.instances[0];
      es.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ vehicles: [update] }) }));
    });

    const v1 = result.current.find((v) => v.id === 'v1')!;
    expect(v1.latestPosition!.latitude).toBe(51.47);
  });

  it('REGRESSION: fix-qa-json-parse-safety — survives missing vehicles key in parsed JSON', () => {
    const { result } = renderHook(() => useRealtimeVehicles(baseVehicles));

    // Valid JSON but missing the vehicles key
    act(() => {
      const es = MockEventSource.instances[0];
      es.onmessage?.(new MessageEvent('message', { data: JSON.stringify({ data: [] }) }));
    });

    expect(result.current).toEqual(baseVehicles);
  });

  it('cleans up EventSource on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeVehicles(baseVehicles));
    expect(MockEventSource.instances).toHaveLength(1);

    unmount();

    expect(MockEventSource.instances[0].close).toHaveBeenCalledOnce();
  });
});
