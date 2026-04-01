import { EventEmitter } from "events";

export interface PositionUpdate {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  motionState: "MOVING" | "IDLE" | "PARKED";
  timestamp: string;
}

export interface VehicleStateUpdate {
  vehicles: PositionUpdate[];
}

const POSITION_EVENT = "positions";

const emitter = new EventEmitter();

export function emitPositionUpdates(updates: PositionUpdate[]): void {
  emitter.emit(POSITION_EVENT, updates);
}

export function onPositionUpdates(
  callback: (updates: PositionUpdate[]) => void,
): () => void {
  emitter.on(POSITION_EVENT, callback);
  return () => {
    emitter.off(POSITION_EVENT, callback);
  };
}
