import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  trafficLightColor,
  vehiclesToGeoJSON,
  buildPopupHTML,
  saveMapViewState,
  loadMapViewState,
  type VehicleMarker,
  type VehicleFeature,
} from './map-utils';

const makeVehicle = (overrides: Partial<VehicleMarker> = {}): VehicleMarker => ({
  id: 'v1',
  name: 'Van 01',
  latitude: 51.4545,
  longitude: -2.5879,
  trafficLight: 'GREEN',
  motionState: 'PARKED',
  heading: null,
  speed: null,
  driverName: null,
  licensePlate: 'WR71 HJK',
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

  it('includes popup data in GeoJSON properties', () => {
    const vehicle = makeVehicle({
      speed: 45,
      driverName: 'James Cooper',
      licensePlate: 'WR71 HJK',
    });
    const result = vehiclesToGeoJSON([vehicle]);
    const props = result.features[0].properties;
    expect(props.speed).toBe(45);
    expect(props.driverName).toBe('James Cooper');
    expect(props.licensePlate).toBe('WR71 HJK');
  });

  it('handles null popup fields gracefully', () => {
    const vehicle = makeVehicle({ speed: null, driverName: null });
    const result = vehiclesToGeoJSON([vehicle]);
    const props = result.features[0].properties;
    expect(props.speed).toBeNull();
    expect(props.driverName).toBeNull();
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

const makePopupProps = (overrides: Partial<VehicleFeature['properties']> = {}): VehicleFeature['properties'] => ({
  id: 'v1',
  name: 'Van 01',
  trafficLight: 'GREEN',
  color: '#22c55e',
  motionState: 'PARKED',
  heading: null,
  speed: null,
  driverName: 'James Cooper',
  licensePlate: 'WR71 HJK',
  ...overrides,
});

describe('buildPopupHTML', () => {
  it('includes vehicle name and license plate', () => {
    const html = buildPopupHTML(makePopupProps());
    expect(html).toContain('Van 01');
    expect(html).toContain('WR71 HJK');
  });

  it('includes driver name when assigned', () => {
    const html = buildPopupHTML(makePopupProps({ driverName: 'Priya Patel' }));
    expect(html).toContain('Priya Patel');
  });

  it('shows Unassigned when no driver', () => {
    const html = buildPopupHTML(makePopupProps({ driverName: null }));
    expect(html).toContain('Unassigned');
  });

  it('includes speed for moving vehicles', () => {
    const html = buildPopupHTML(makePopupProps({ speed: 45, motionState: 'MOVING' }));
    expect(html).toContain('45');
    expect(html).toContain('km/h');
    expect(html).toContain('Moving');
  });

  it('shows motion state without speed when parked', () => {
    const html = buildPopupHTML(makePopupProps({ speed: null, motionState: 'PARKED' }));
    expect(html).toContain('Parked');
    expect(html).not.toContain('km/h');
  });

  it('includes link to vehicle detail page', () => {
    const html = buildPopupHTML(makePopupProps({ id: 'abc123' }));
    expect(html).toContain('/vehicles/abc123');
    expect(html).toContain('View details');
  });

  it('includes traffic light status indicator', () => {
    const html = buildPopupHTML(makePopupProps({ trafficLight: 'RED', color: '#ef4444' }));
    expect(html).toContain('#ef4444');
    expect(html).toContain('Overdue');
  });
});

describe('saveMapViewState / loadMapViewState', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  };

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('returns null when no saved state exists', () => {
    expect(loadMapViewState()).toBeNull();
  });

  it('saves and loads center and zoom', () => {
    saveMapViewState({ center: [-2.5879, 51.4545], zoom: 13 });
    const state = loadMapViewState();
    expect(state).toEqual({ center: [-2.5879, 51.4545], zoom: 13 });
  });

  it('overwrites previous state on save', () => {
    saveMapViewState({ center: [-2.5, 51.4], zoom: 10 });
    saveMapViewState({ center: [-3.0, 52.0], zoom: 15 });
    const state = loadMapViewState();
    expect(state).toEqual({ center: [-3.0, 52.0], zoom: 15 });
  });

  it('returns null if stored value is invalid JSON', () => {
    localStorage.setItem('openfleet-map-view', 'not-json');
    expect(loadMapViewState()).toBeNull();
  });

  it('returns null if stored value is missing required fields', () => {
    localStorage.setItem('openfleet-map-view', JSON.stringify({ zoom: 10 }));
    expect(loadMapViewState()).toBeNull();
  });
});
