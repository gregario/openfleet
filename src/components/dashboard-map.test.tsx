import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { DashboardMap } from './dashboard-map';
import type { VehicleWithPosition } from '@/lib/vehicles';

// Mock FleetMap since it requires WebGL
vi.mock('./fleet-map', () => ({
  FleetMap: vi.fn(({ vehicles }) => (
    <div data-testid="fleet-map" data-vehicle-count={vehicles.length} />
  )),
}));

// Mock the realtime hook
const mockUseRealtimeVehicles = vi.fn((initial: VehicleWithPosition[]) => initial);
vi.mock('@/hooks/use-realtime-vehicles', () => ({
  useRealtimeVehicles: (initial: VehicleWithPosition[]) => mockUseRealtimeVehicles(initial),
}));

const vehicles: VehicleWithPosition[] = [
  {
    id: 'v1',
    name: 'Van 01',
    trafficLight: 'GREEN',
    motionState: 'PARKED',
    latestPosition: { latitude: 51.45, longitude: -2.58 },
  },
  {
    id: 'v2',
    name: 'Van 02',
    trafficLight: 'RED',
    motionState: 'MOVING',
    latestPosition: { latitude: 51.46, longitude: -2.59, heading: 90, speed: 30, timestamp: '2026-04-01T10:00:00Z' },
  },
];

describe('DashboardMap', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('passes initial vehicles to the realtime hook', () => {
    render(<DashboardMap initialVehicles={vehicles} />);
    expect(mockUseRealtimeVehicles).toHaveBeenCalledWith(vehicles);
  });

  it('renders FleetMap with markers from vehicles that have positions', () => {
    const { container } = render(<DashboardMap initialVehicles={vehicles} />);
    const map = container.querySelector('[data-testid="fleet-map"]');
    expect(map?.getAttribute('data-vehicle-count')).toBe('2');
  });

  it('filters out vehicles without positions', () => {
    const withNull: VehicleWithPosition[] = [
      { id: 'v1', name: 'Van 01', trafficLight: 'GREEN', motionState: 'PARKED', latestPosition: null },
    ];
    const { container } = render(<DashboardMap initialVehicles={withNull} />);
    const map = container.querySelector('[data-testid="fleet-map"]');
    expect(map?.getAttribute('data-vehicle-count')).toBe('0');
  });
});
