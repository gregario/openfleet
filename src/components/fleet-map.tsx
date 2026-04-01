'use client';

import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { vehiclesToGeoJSON, trafficLightColor, type VehicleMarker } from '@/lib/map-utils';

const CLUSTER_MAX_ZOOM = 14;
const CLUSTER_RADIUS = 50;

// Open tile source — no API key needed
const TILE_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Default center: Bristol, UK (matches seed data for Clearwater Plumbing)
const DEFAULT_CENTER: [number, number] = [-2.5879, 51.4545];
const DEFAULT_ZOOM = 11;

interface FleetMapProps {
  vehicles: VehicleMarker[];
}

export function FleetMap({ vehicles }: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.on('load', () => {
      // Add clustered vehicle source
      map.addSource('vehicles', {
        type: 'geojson',
        data: vehiclesToGeoJSON(vehicles),
        cluster: true,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: CLUSTER_RADIUS,
      });

      // Cluster circles
      map.addLayer({
        id: 'vehicle-clusters',
        type: 'circle',
        source: 'vehicles',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#64748b',
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 25, 40],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Cluster count labels
      map.addLayer({
        id: 'vehicle-cluster-count',
        type: 'symbol',
        source: 'vehicles',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 14,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Individual vehicle markers — color-coded by traffic light
      map.addLayer({
        id: 'vehicle-markers',
        type: 'circle',
        source: 'vehicles',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Direction of travel arrow — only for moving vehicles
      map.addLayer({
        id: 'vehicle-direction',
        type: 'symbol',
        source: 'vehicles',
        filter: [
          'all',
          ['!', ['has', 'point_count']],
          ['==', ['get', 'motionState'], 'MOVING'],
        ],
        layout: {
          'text-field': '▲',
          'text-size': 14,
          'text-rotate': ['get', 'heading'],
          'text-rotation-alignment': 'map',
          'text-allow-overlap': true,
          'text-offset': [0, -1.8],
        },
        paint: {
          'text-color': ['get', 'color'],
        },
      });

      // Vehicle name labels
      map.addLayer({
        id: 'vehicle-labels',
        type: 'symbol',
        source: 'vehicles',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#334155',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      });

      // Zoom into cluster on click
      map.on('click', 'vehicle-clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['vehicle-clusters'],
        });
        if (!features.length) return;
        const clusterId = features[0].properties.cluster_id;
        const source = map.getSource('vehicles') as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        });
      });

      // Cursor change on hover
      map.on('mouseenter', 'vehicle-clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'vehicle-clusters', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'vehicle-markers', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'vehicle-markers', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update vehicle data when props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource('vehicles') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(vehiclesToGeoJSON(vehicles));
    }
  }, [vehicles]);

  return (
    <div
      ref={containerRef}
      data-testid="fleet-map"
      className="h-full w-full min-h-[500px]"
    />
  );
}
