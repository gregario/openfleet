import { describe, it, expect } from 'vitest';
import { mapVehiclesToMarkers, type VehicleWithPosition } from './vehicles';

describe('mapVehiclesToMarkers', () => {
  it('maps vehicles with positions to VehicleMarker array', () => {
    const vehicles: VehicleWithPosition[] = [
      {
        id: 'v1',
        name: 'Van 01',
        trafficLight: 'GREEN',
        motionState: 'PARKED',
        latestPosition: { latitude: 51.45, longitude: -2.58 },
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
    });
  });

  it('excludes vehicles without a position', () => {
    const vehicles: VehicleWithPosition[] = [
      {
        id: 'v1',
        name: 'Van 01',
        trafficLight: 'GREEN',
        motionState: 'PARKED',
        latestPosition: null,
      },
      {
        id: 'v2',
        name: 'Van 02',
        trafficLight: 'RED',
        motionState: 'MOVING',
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
