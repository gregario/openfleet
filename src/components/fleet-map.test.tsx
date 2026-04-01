import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { FleetMap } from './fleet-map';
import type { VehicleMarker } from '@/lib/map-utils';
import * as mapUtils from '@/lib/map-utils';

// Mock maplibre-gl — it requires WebGL which jsdom doesn't have
const mockAddSource = vi.fn();
const mockAddLayer = vi.fn();
const mockGetSource = vi.fn().mockReturnValue(null);
const mockRemove = vi.fn();
const mockOn = vi.fn();
const mockPopupSetHTML = vi.fn().mockReturnThis();
const mockPopupSetLngLat = vi.fn().mockReturnThis();
const mockPopupAddTo = vi.fn().mockReturnThis();
const mockPopupRemove = vi.fn();
const mockQueryRenderedFeatures = vi.fn().mockReturnValue([]);

const mockMapInstances: Array<{ options: Record<string, unknown> }> = [];

vi.mock('maplibre-gl', () => {
  class MockPopup {
    setLngLat = mockPopupSetLngLat;
    setHTML = mockPopupSetHTML;
    addTo = mockPopupAddTo;
    remove = mockPopupRemove;
  }
  class MockMap {
    addSource = mockAddSource;
    addLayer = mockAddLayer;
    getSource = mockGetSource;
    remove = mockRemove;
    on = mockOn;
    getCanvas = vi.fn().mockReturnValue({ style: {} });
    getContainer = vi.fn().mockReturnValue(document.createElement('div'));
    queryRenderedFeatures = mockQueryRenderedFeatures;
    easeTo = vi.fn();
    getCenter = vi.fn().mockReturnValue({ lng: -2.5879, lat: 51.4545 });
    getZoom = vi.fn().mockReturnValue(11);
    constructor(options: Record<string, unknown>) {
      mockMapInstances.push({ options });
    }
  }
  return {
    Map: MockMap,
    Popup: MockPopup,
    default: { Map: MockMap, Popup: MockPopup },
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
    heading: null,
    speed: null,
    driverName: 'James Cooper',
    licensePlate: 'WR71 HJK',
  },
  {
    id: 'v2',
    name: 'Van 02',
    latitude: 51.46,
    longitude: -2.59,
    trafficLight: 'RED',
    motionState: 'MOVING',
    heading: 90,
    speed: 45,
    driverName: null,
    licensePlate: 'WR72 ABC',
  },
];

describe('FleetMap component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMapInstances.length = 0;
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
    // Should add 5 layers: clusters, cluster-count, markers, direction arrows, labels
    expect(mockAddLayer).toHaveBeenCalledTimes(5);
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

  it('adds direction arrow layer for moving vehicles', () => {
    render(<FleetMap vehicles={vehicles} />);
    const loadCall = mockOn.mock.calls.find((call) => call[0] === 'load');
    if (loadCall) loadCall[1]();

    const directionLayerCall = mockAddLayer.mock.calls.find(
      (call) => call[0].id === 'vehicle-direction',
    );
    expect(directionLayerCall).toBeTruthy();
    // Should only show for non-clustered moving vehicles
    expect(directionLayerCall![0].filter).toEqual([
      'all',
      ['!', ['has', 'point_count']],
      ['==', ['get', 'motionState'], 'MOVING'],
    ]);
    // Should rotate by heading
    expect(directionLayerCall![0].layout['text-rotate']).toEqual(['get', 'heading']);
  });

  it('registers click handler on vehicle-markers layer', () => {
    render(<FleetMap vehicles={vehicles} />);
    const loadCall = mockOn.mock.calls.find((call) => call[0] === 'load');
    if (loadCall) loadCall[1]();

    const markerClickCall = mockOn.mock.calls.find(
      (call) => call[0] === 'click' && call[1] === 'vehicle-markers',
    );
    expect(markerClickCall).toBeTruthy();
  });

  it('creates popup with vehicle stats when vehicle marker is clicked', () => {
    render(<FleetMap vehicles={vehicles} />);
    const loadCall = mockOn.mock.calls.find((call) => call[0] === 'load');
    if (loadCall) loadCall[1]();

    // Simulate clicking a vehicle marker
    const markerClickCall = mockOn.mock.calls.find(
      (call) => call[0] === 'click' && call[1] === 'vehicle-markers',
    );
    expect(markerClickCall).toBeTruthy();

    mockQueryRenderedFeatures.mockReturnValueOnce([
      {
        geometry: { type: 'Point', coordinates: [-2.5879, 51.4545] },
        properties: {
          id: 'v1',
          name: 'Van 01',
          trafficLight: 'GREEN',
          motionState: 'PARKED',
          speed: null,
          driverName: 'James Cooper',
          licensePlate: 'WR71 HJK',
        },
      },
    ]);

    const clickHandler = markerClickCall![2];
    clickHandler({ point: { x: 100, y: 100 }, lngLat: { lng: -2.5879, lat: 51.4545 } });

    expect(mockPopupSetLngLat).toHaveBeenCalledWith([-2.5879, 51.4545]);
    expect(mockPopupSetHTML).toHaveBeenCalled();
    expect(mockPopupAddTo).toHaveBeenCalled();

    const html = mockPopupSetHTML.mock.calls[0][0] as string;
    expect(html).toContain('Van 01');
    expect(html).toContain('WR71 HJK');
    expect(html).toContain('James Cooper');
    expect(html).toContain('/vehicles/v1');
  });

  it('popup shows speed for moving vehicles', () => {
    render(<FleetMap vehicles={vehicles} />);
    const loadCall = mockOn.mock.calls.find((call) => call[0] === 'load');
    if (loadCall) loadCall[1]();

    const markerClickCall = mockOn.mock.calls.find(
      (call) => call[0] === 'click' && call[1] === 'vehicle-markers',
    );

    mockQueryRenderedFeatures.mockReturnValueOnce([
      {
        geometry: { type: 'Point', coordinates: [-2.59, 51.46] },
        properties: {
          id: 'v2',
          name: 'Van 02',
          trafficLight: 'RED',
          motionState: 'MOVING',
          speed: 45,
          driverName: null,
          licensePlate: 'WR72 ABC',
        },
      },
    ]);

    const clickHandler = markerClickCall![2];
    clickHandler({ point: { x: 200, y: 200 }, lngLat: { lng: -2.59, lat: 51.46 } });

    const html = mockPopupSetHTML.mock.calls[0][0] as string;
    expect(html).toContain('45');
    expect(html).toContain('km/h');
  });

  it('popup shows Unassigned when no driver', () => {
    render(<FleetMap vehicles={vehicles} />);
    const loadCall = mockOn.mock.calls.find((call) => call[0] === 'load');
    if (loadCall) loadCall[1]();

    const markerClickCall = mockOn.mock.calls.find(
      (call) => call[0] === 'click' && call[1] === 'vehicle-markers',
    );

    mockQueryRenderedFeatures.mockReturnValueOnce([
      {
        geometry: { type: 'Point', coordinates: [-2.59, 51.46] },
        properties: {
          id: 'v2',
          name: 'Van 02',
          trafficLight: 'RED',
          motionState: 'MOVING',
          speed: 45,
          driverName: null,
          licensePlate: 'WR72 ABC',
        },
      },
    ]);

    const clickHandler = markerClickCall![2];
    clickHandler({ point: { x: 200, y: 200 }, lngLat: { lng: -2.59, lat: 51.46 } });

    const html = mockPopupSetHTML.mock.calls[0][0] as string;
    expect(html).toContain('Unassigned');
  });

  it('does not create popup when no features at click point', () => {
    render(<FleetMap vehicles={vehicles} />);
    const loadCall = mockOn.mock.calls.find((call) => call[0] === 'load');
    if (loadCall) loadCall[1]();

    const markerClickCall = mockOn.mock.calls.find(
      (call) => call[0] === 'click' && call[1] === 'vehicle-markers',
    );

    mockQueryRenderedFeatures.mockReturnValueOnce([]);

    const clickHandler = markerClickCall![2];
    clickHandler({ point: { x: 100, y: 100 }, lngLat: { lng: -2.5879, lat: 51.4545 } });

    expect(mockPopupSetHTML).not.toHaveBeenCalled();
  });

  it('initializes map with saved center and zoom from localStorage', () => {
    vi.spyOn(mapUtils, 'loadMapViewState').mockReturnValue({
      center: [-3.0, 52.0],
      zoom: 15,
    });

    render(<FleetMap vehicles={vehicles} />);

    expect(mockMapInstances).toHaveLength(1);
    expect(mockMapInstances[0].options.center).toEqual([-3.0, 52.0]);
    expect(mockMapInstances[0].options.zoom).toBe(15);
  });

  it('uses default center and zoom when no saved state', () => {
    vi.spyOn(mapUtils, 'loadMapViewState').mockReturnValue(null);

    render(<FleetMap vehicles={vehicles} />);

    expect(mockMapInstances).toHaveLength(1);
    expect(mockMapInstances[0].options.center).toEqual([-2.5879, 51.4545]);
    expect(mockMapInstances[0].options.zoom).toBe(11);
  });

  it('registers moveend handler that saves map state', () => {
    const saveSpy = vi.spyOn(mapUtils, 'saveMapViewState');
    vi.spyOn(mapUtils, 'loadMapViewState').mockReturnValue(null);

    render(<FleetMap vehicles={vehicles} />);

    const moveendCall = mockOn.mock.calls.find((call) => call[0] === 'moveend');
    expect(moveendCall).toBeTruthy();

    // Simulate moveend event
    moveendCall![1]();

    expect(saveSpy).toHaveBeenCalledWith({
      center: [-2.5879, 51.4545],
      zoom: 11,
    });
  });
});
