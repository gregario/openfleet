import type { VehicleMarker } from './map-utils';

export interface VehicleWithPosition {
  id: string;
  name: string;
  trafficLight: 'GREEN' | 'ORANGE' | 'RED';
  motionState: 'MOVING' | 'IDLE' | 'PARKED';
  latestPosition: { latitude: number; longitude: number } | null;
}

export function mapVehiclesToMarkers(vehicles: VehicleWithPosition[]): VehicleMarker[] {
  return vehicles
    .filter((v): v is VehicleWithPosition & { latestPosition: NonNullable<VehicleWithPosition['latestPosition']> } =>
      v.latestPosition !== null,
    )
    .map((v) => ({
      id: v.id,
      name: v.name,
      latitude: v.latestPosition.latitude,
      longitude: v.latestPosition.longitude,
      trafficLight: v.trafficLight,
      motionState: v.motionState,
    }));
}
