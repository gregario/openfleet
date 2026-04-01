import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { FleetMap } from './fleet-map';
import type { VehicleMarker } from '@/lib/map-utils';

// Mock maplibre-gl — it requires WebGL which jsdom doesn't have
const mockAddSource = vi.fn();
const mockAddLayer = vi.fn();
const mockGetSource = vi.fn().mockReturnValue(null);
const mockRemove = vi.fn();
const mockOn = vi.fn();

vi.mock('maplibre-gl', () => {
  class MockMap {
    addSource = mockAddSource;
    addLayer = mockAddLayer;
    getSource = mockGetSource;
    remove = mockRemove;
    on = mockOn;
    getCanvas = vi.fn().mockReturnValue({ style: {} });
    getContainer = vi.fn().mockReturnValue(document.createElement('div'));
    queryRenderedFeatures = vi.fn().mockReturnValue([]);
    easeTo = vi.fn();
  }
  return {
    Map: MockMap,
    default: { Map: MockMap },
  };
});

// Mock the CSS import
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

const vehicles: VehicleMarker[] = [
  {
    id: 'v1',
    name: 'Van 01',
    latitude: 51.4545,
    longitude: -2.5879,
    trafficLight: 'GREEN',
    motionState: 'PARKED',
  },
  {
    id: 'v2',
    name: 'Van 02',
    latitude: 51.46,
    longitude: -2.59,
    trafficLight: 'RED',
    motionState: 'MOVING',
  },
];

describe('FleetMap component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders a map container div', () => {
    const { container } = render(<FleetMap vehicles={[]} />);
    expect(container.querySelector('[data-testid="fleet-map"]')).toBeTruthy();
  });

  it('initializes MapLibre map on mount', () => {
    render(<FleetMap vehicles={vehicles} />);
    expect(mockOn).toHaveBeenCalled();
  });

  it('registers load event handler', () => {
    render(<FleetMap vehicles={vehicles} />);
    const loadCall = mockOn.mock.calls.find((call) => call[0] === 'load');
    expect(loadCall).toBeTruthy();
  });

  it('calls map.remove on unmount', () => {
    const { unmount } = render(<FleetMap vehicles={vehicles} />);
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('adds vehicle source and layers on load', () => {
    render(<FleetMap vehicles={vehicles} />);
    // Simulate the load event
    const loadCall = mockOn.mock.calls.find((call) => call[0] === 'load');
    if (loadCall) loadCall[1]();

    expect(mockAddSource).toHaveBeenCalledWith('vehicles', expect.objectContaining({
      type: 'geojson',
      cluster: true,
    }));
    // Should add 4 layers: clusters, cluster-count, markers, labels
    expect(mockAddLayer).toHaveBeenCalledTimes(4);
  });

  it('configures clustering on the vehicle source', () => {
    render(<FleetMap vehicles={vehicles} />);
    const loadCall = mockOn.mock.calls.find((call) => call[0] === 'load');
    if (loadCall) loadCall[1]();

    const sourceCall = mockAddSource.mock.calls[0];
    expect(sourceCall[1].cluster).toBe(true);
    expect(sourceCall[1].clusterMaxZoom).toBeDefined();
    expect(sourceCall[1].clusterRadius).toBeDefined();
  });

  it('sets vehicle marker color from trafficLight property', () => {
    render(<FleetMap vehicles={vehicles} />);
    const loadCall = mockOn.mock.calls.find((call) => call[0] === 'load');
    if (loadCall) loadCall[1]();

    // Find the vehicle-markers layer
    const markerLayerCall = mockAddLayer.mock.calls.find(
      (call) => call[0].id === 'vehicle-markers',
    );
    expect(markerLayerCall).toBeTruthy();
    // circle-color should use ['get', 'color'] expression to read from feature properties
    expect(markerLayerCall![0].paint['circle-color']).toEqual(['get', 'color']);
  });
});
