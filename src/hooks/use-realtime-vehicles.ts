'use client';

import { useState, useEffect } from 'react';
import type { VehicleWithPosition } from '@/lib/vehicles';

export interface PositionUpdate {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  motionState: 'MOVING' | 'IDLE' | 'PARKED';
  timestamp: string;
}

export function useRealtimeVehicles(initialVehicles: VehicleWithPosition[]): VehicleWithPosition[] {
  const [vehicles, setVehicles] = useState<VehicleWithPosition[]>(initialVehicles);

  useEffect(() => {
    const es = new EventSource('/api/positions/stream');

    es.onmessage = (event: MessageEvent) => {
      let updates: PositionUpdate[];
      try {
        const parsed = JSON.parse(event.data as string);
        updates = parsed.vehicles;
      } catch {
        // Malformed SSE data — ignore and keep listening
        return;
      }
      if (!Array.isArray(updates)) return;

      setVehicles((prev) => {
        // Build a lookup map for O(1) access
        const byId = new Map(prev.map((v) => [v.id, v]));
        let changed = false;

        for (const update of updates) {
          const vehicle = byId.get(update.vehicleId);
          if (!vehicle) continue;

          byId.set(update.vehicleId, {
            ...vehicle,
            motionState: update.motionState,
            latestPosition: {
              latitude: update.latitude,
              longitude: update.longitude,
              speed: update.speed,
              heading: update.heading,
              timestamp: update.timestamp,
            },
          });
          changed = true;
        }

        if (!changed) return prev;
        return prev.map((v) => byId.get(v.id)!);
      });
    };

    return () => {
      es.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return vehicles;
}
