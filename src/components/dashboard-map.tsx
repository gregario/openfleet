'use client';

import { useState } from 'react';
import { useRealtimeVehicles } from '@/hooks/use-realtime-vehicles';
import { mapVehiclesToMarkers, type VehicleWithPosition } from '@/lib/vehicles';
import { FleetMap } from './fleet-map';
import { ErrorBoundary } from './error-boundary';
import { EmptyState } from './empty-state';

interface DashboardMapProps {
  initialVehicles: VehicleWithPosition[];
}

export function DashboardMap({ initialVehicles }: DashboardMapProps) {
  const vehicles = useRealtimeVehicles(initialVehicles);
  const markers = mapVehiclesToMarkers(vehicles);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [errorKey, setErrorKey] = useState(0);

  if (initialVehicles.length === 0) {
    return (
      <div data-testid="map-empty-state">
        <EmptyState
          title="No vehicles to display"
          description="Add vehicles to see them on the map."
          action={{ label: 'Add Vehicle', href: '/vehicles' }}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary
      key={errorKey}
      fallback={
        <div
          data-testid="map-error-state"
          className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center"
        >
          <h2 className="text-lg font-semibold text-red-900">
            Unable to load map
          </h2>
          <p className="text-sm text-red-700">
            Something went wrong loading the fleet map. Try again or contact
            your administrator.
          </p>
          <button
            onClick={() => {
              setIsMapLoaded(false);
              setErrorKey((k) => k + 1);
            }}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      }
    >
      <div className="relative h-full w-full">
        {!isMapLoaded && (
          <div
            data-testid="map-loading-skeleton"
            className="absolute inset-0 z-10 animate-pulse rounded-lg bg-slate-200"
          >
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">Loading map...</p>
            </div>
          </div>
        )}
        <FleetMap vehicles={markers} onLoad={() => setIsMapLoaded(true)} />
      </div>
    </ErrorBoundary>
  );
}
