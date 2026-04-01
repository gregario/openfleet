export interface VehicleMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  trafficLight: 'GREEN' | 'ORANGE' | 'RED';
  motionState: 'MOVING' | 'IDLE' | 'PARKED';
  heading: number | null;
  speed: number | null;
  driverName: string | null;
  licensePlate: string;
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
    heading: number | null;
    speed: number | null;
    driverName: string | null;
    licensePlate: string;
  };
}

export interface VehicleFeatureCollection {
  type: 'FeatureCollection';
  features: VehicleFeature[];
}

const MOTION_STATE_LABELS: Record<string, string> = {
  MOVING: 'Moving',
  IDLE: 'Idle',
  PARKED: 'Parked',
};

const TRAFFIC_LIGHT_LABELS: Record<string, string> = {
  GREEN: 'All clear',
  ORANGE: 'Needs attention',
  RED: 'Overdue',
};

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPopupHTML(props: VehicleFeature['properties']): string {
  const statusLabel = TRAFFIC_LIGHT_LABELS[props.trafficLight] ?? props.trafficLight;
  const motionLabel = MOTION_STATE_LABELS[props.motionState] ?? props.motionState;
  const driverLabel = escapeHTML(props.driverName || 'Unassigned');
  const speedLine = props.speed != null
    ? `<div style="font-size:12px;color:#64748b;">${Math.round(props.speed)} km/h · ${motionLabel}</div>`
    : `<div style="font-size:12px;color:#64748b;">${motionLabel}</div>`;

  return `<div style="min-width:180px;font-family:system-ui,sans-serif;">
  <div style="font-weight:600;font-size:14px;margin-bottom:2px;">${escapeHTML(props.name)}</div>
  <div style="font-size:12px;color:#64748b;margin-bottom:6px;">${escapeHTML(props.licensePlate)}</div>
  <div style="font-size:12px;margin-bottom:2px;">
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${props.color};margin-right:4px;vertical-align:middle;"></span>
    ${statusLabel}
  </div>
  ${speedLine}
  <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Driver: ${driverLabel}</div>
  <a href="/vehicles/${props.id}" style="font-size:12px;color:#3b82f6;text-decoration:none;">View details →</a>
</div>`;
}

// --- Map view persistence ---

const MAP_VIEW_STORAGE_KEY = 'openfleet-map-view';

export interface MapViewState {
  center: [number, number];
  zoom: number;
}

export function saveMapViewState(state: MapViewState): void {
  try {
    localStorage.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (SSR, private browsing quota) — silently ignore
  }
}

export function loadMapViewState(): MapViewState | null {
  try {
    const raw = localStorage.getItem(MAP_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.center) ||
      parsed.center.length !== 2 ||
      typeof parsed.center[0] !== 'number' ||
      typeof parsed.center[1] !== 'number' ||
      typeof parsed.zoom !== 'number'
    ) {
      return null;
    }
    return { center: parsed.center, zoom: parsed.zoom };
  } catch {
    return null;
  }
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
        heading: v.heading,
        speed: v.speed,
        driverName: v.driverName,
        licensePlate: v.licensePlate,
      },
    })),
  };
}
