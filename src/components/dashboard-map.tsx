'use client';

import { useRealtimeVehicles } from '@/hooks/use-realtime-vehicles';
import { mapVehiclesToMarkers, type VehicleWithPosition } from '@/lib/vehicles';
import { FleetMap } from './fleet-map';

interface DashboardMapProps {
  initialVehicles: VehicleWithPosition[];
}

export function DashboardMap({ initialVehicles }: DashboardMapProps) {
  const vehicles = useRealtimeVehicles(initialVehicles);
  const markers = mapVehiclesToMarkers(vehicles);

  return <FleetMap vehicles={markers} />;
}
