import { describe, it, expect } from 'vitest';
import { mapVehiclesToMarkers, type VehicleWithPosition } from './vehicles';

// @criterion: fa1-map-load-001, po-check-001
// @criterion-hash: ab84bbc818bc, 3d7e1f824a90
describe('mapVehiclesToMarkers', () => {
  it('maps vehicles with positions to VehicleMarker array', () => {
    const vehicles: VehicleWithPosition[] = [
      {
        id: 'v1',
        name: 'Van 01',
        trafficLight: 'GREEN',
        motionState: 'PARKED',
        licensePlate: 'WR71 HJK',
        driverName: 'James Cooper',
        latestPosition: { latitude: 51.45, longitude: -2.58, speed: 0 },
      },
    ];
    const markers = mapVehiclesToMarkers(vehicles);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toEqual({
      id: 'v1',
      name: 'Van 01',
      latitude: 51.45,
      longitude: -2.58,
      trafficLight: 'GREEN',
      motionState: 'PARKED',
      heading: null,
      speed: 0,
      driverName: 'James Cooper',
      licensePlate: 'WR71 HJK',
    });
  });

  it('excludes vehicles without a position', () => {
    const vehicles: VehicleWithPosition[] = [
      {
        id: 'v1',
        name: 'Van 01',
        trafficLight: 'GREEN',
        motionState: 'PARKED',
        licensePlate: 'WR71 HJK',
        driverName: null,
        latestPosition: null,
      },
      {
        id: 'v2',
        name: 'Van 02',
        trafficLight: 'RED',
        motionState: 'MOVING',
        licensePlate: 'WR72 ABC',
        driverName: 'Priya Patel',
        latestPosition: { latitude: 51.46, longitude: -2.59 },
      },
    ];
    const markers = mapVehiclesToMarkers(vehicles);
    expect(markers).toHaveLength(1);
    expect(markers[0].id).toBe('v2');
  });

  it('returns empty array for empty input', () => {
    expect(mapVehiclesToMarkers([])).toEqual([]);
  });
});
