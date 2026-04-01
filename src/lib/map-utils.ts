export interface VehicleMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  trafficLight: 'GREEN' | 'ORANGE' | 'RED';
  motionState: 'MOVING' | 'IDLE' | 'PARKED';
}

const TRAFFIC_LIGHT_COLORS: Record<VehicleMarker['trafficLight'], string> = {
  GREEN: '#22c55e',
  ORANGE: '#f59e0b',
  RED: '#ef4444',
};

export function trafficLightColor(status: VehicleMarker['trafficLight']): string {
  return TRAFFIC_LIGHT_COLORS[status];
}

export interface VehicleFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: string;
    name: string;
    trafficLight: string;
    color: string;
    motionState: string;
  };
}

export interface VehicleFeatureCollection {
  type: 'FeatureCollection';
  features: VehicleFeature[];
}

export function vehiclesToGeoJSON(vehicles: VehicleMarker[]): VehicleFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: vehicles.map((v) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [v.longitude, v.latitude] as [number, number],
      },
      properties: {
        id: v.id,
        name: v.name,
        trafficLight: v.trafficLight,
        color: trafficLightColor(v.trafficLight),
        motionState: v.motionState,
      },
    })),
  };
}
