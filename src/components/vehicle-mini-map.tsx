'use client';

import { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const TILE_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const TRAFFIC_LIGHT_COLORS: Record<string, string> = {
  GREEN: '#22c55e',
  ORANGE: '#f59e0b',
  RED: '#ef4444',
};

interface VehicleMiniMapProps {
  latitude: number;
  longitude: number;
  vehicleName: string;
  trafficLight: 'GREEN' | 'ORANGE' | 'RED';
}

export function VehicleMiniMap({ latitude, longitude, vehicleName, trafficLight }: VehicleMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center: [longitude, latitude],
      zoom: 14,
      interactive: false,
      attributionControl: false,
    });

    // Create marker element
    const el = document.createElement('div');
    el.style.width = '16px';
    el.style.height = '16px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = TRAFFIC_LIGHT_COLORS[trafficLight] || '#64748b';
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
    el.title = vehicleName;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [latitude, longitude, vehicleName, trafficLight]);

  return (
    <div
      ref={containerRef}
      data-testid="vehicle-mini-map"
      className="h-full w-full"
    />
  );
}
