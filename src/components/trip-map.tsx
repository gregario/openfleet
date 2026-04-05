'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const TILE_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export interface TripPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface TripMapProps {
  points: TripPoint[];
  startLat: number | null;
  startLon: number | null;
  endLat: number | null;
  endLon: number | null;
}

/**
 * Renders a trip's route as a polyline on a MapLibre map with start/end markers.
 * The view auto-fits the polyline bounding box.
 */
export function TripMap({ points, startLat, startLon, endLat, endLon }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (points.length === 0) return;

    const coords: [number, number][] = points.map((p) => [p.longitude, p.latitude]);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center: coords[0],
      zoom: 12,
    });

    map.on('load', () => {
      // Polyline layer
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
        },
      });

      // Start marker
      if (startLat != null && startLon != null) {
        new maplibregl.Marker({ color: '#16a34a' })
          .setLngLat([startLon, startLat])
          .setPopup(new maplibregl.Popup().setText('Trip start'))
          .addTo(map);
      }
      // End marker
      if (endLat != null && endLon != null) {
        new maplibregl.Marker({ color: '#dc2626' })
          .setLngLat([endLon, endLat])
          .setPopup(new maplibregl.Popup().setText('Trip end'))
          .addTo(map);
      }

      // Fit bounds to the route
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0]),
      );
      map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 15 });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points, startLat, startLon, endLat, endLon]);

  if (points.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-500">
        No route data for this trip.
      </div>
    );
  }

  return <div ref={containerRef} className="h-96 w-full rounded-md border border-slate-200" />;
}
