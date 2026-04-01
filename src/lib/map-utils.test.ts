import { describe, it, expect } from 'vitest';
import {
  trafficLightColor,
  vehiclesToGeoJSON,
  type VehicleMarker,
} from './map-utils';

const makeVehicle = (overrides: Partial<VehicleMarker> = {}): VehicleMarker => ({
  id: 'v1',
  name: 'Van 01',
  latitude: 51.4545,
  longitude: -2.5879,
  trafficLight: 'GREEN',
  motionState: 'PARKED',
  heading: null,
  ...overrides,
});

describe('trafficLightColor', () => {
  it('returns green hex for GREEN status', () => {
    expect(trafficLightColor('GREEN')).toBe('#22c55e');
  });

  it('returns orange hex for ORANGE status', () => {
    expect(trafficLightColor('ORANGE')).toBe('#f59e0b');
  });

  it('returns red hex for RED status', () => {
    expect(trafficLightColor('RED')).toBe('#ef4444');
  });
});

describe('vehiclesToGeoJSON', () => {
  it('converts an empty array to empty FeatureCollection', () => {
    const result = vehiclesToGeoJSON([]);
    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(0);
  });

  it('converts vehicles to GeoJSON features with correct coordinates', () => {
    const vehicles = [makeVehicle()];
    const result = vehiclesToGeoJSON(vehicles);

    expect(result.features).toHaveLength(1);
    const feature = result.features[0];
    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Point');
    expect(feature.geometry.coordinates).toEqual([-2.5879, 51.4545]); // [lon, lat]
  });

  it('includes vehicle properties for marker styling', () => {
    const vehicle = makeVehicle({ trafficLight: 'RED', motionState: 'MOVING' });
    const result = vehiclesToGeoJSON([vehicle]);
    const props = result.features[0].properties;

    expect(props.id).toBe('v1');
    expect(props.name).toBe('Van 01');
    expect(props.trafficLight).toBe('RED');
    expect(props.color).toBe('#ef4444');
    expect(props.motionState).toBe('MOVING');
  });

  it('includes heading in GeoJSON properties for direction of travel', () => {
    const vehicle = makeVehicle({ motionState: 'MOVING', heading: 135 });
    const result = vehiclesToGeoJSON([vehicle]);
    expect(result.features[0].properties.heading).toBe(135);
  });

  it('includes null heading for parked vehicles', () => {
    const vehicle = makeVehicle({ motionState: 'PARKED', heading: null });
    const result = vehiclesToGeoJSON([vehicle]);
    expect(result.features[0].properties.heading).toBeNull();
  });

  it('handles 50 vehicles for performance AC', () => {
    const vehicles = Array.from({ length: 50 }, (_, i) =>
      makeVehicle({
        id: `v${i}`,
        name: `Van ${String(i + 1).padStart(2, '0')}`,
        latitude: 51.4 + i * 0.01,
        longitude: -2.6 + i * 0.01,
        trafficLight: ['GREEN', 'ORANGE', 'RED'][i % 3] as VehicleMarker['trafficLight'],
      }),
    );
    const result = vehiclesToGeoJSON(vehicles);
    expect(result.features).toHaveLength(50);
    // Verify color distribution
    const colors = result.features.map((f) => f.properties.color);
    expect(colors.filter((c) => c === '#22c55e')).toHaveLength(17); // GREEN
    expect(colors.filter((c) => c === '#f59e0b')).toHaveLength(17); // ORANGE
    expect(colors.filter((c) => c === '#ef4444')).toHaveLength(16); // RED
  });
});
