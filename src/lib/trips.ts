/**
 * Trip detection library
 *
 * Pure functions for deriving trip boundaries from position streams.
 * Thresholds per spec:
 *  - Trip start: speed >5km/h for >30s
 *  - Trip end: stationary (<0.5km/h) for >3min
 *  - Minimum trip distance: 200m (trips shorter than this are discarded)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface PositionPoint {
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string; // ISO8601
}

export const TRIP_START_SPEED_KMH = 5;
export const TRIP_START_WINDOW_SECONDS = 30;
export const TRIP_END_STATIONARY_SPEED_KMH = 0.5;
export const TRIP_END_WINDOW_SECONDS = 180; // 3 minutes
export const MIN_TRIP_DISTANCE_KM = 0.2; // 200m

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two lat/lon points in kilometers.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Sum haversine distances between consecutive points.
 * Returns 0 for empty or single-point arrays.
 */
export function calculateTripDistanceKm(points: PositionPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    total += haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
  }
  return total;
}

/**
 * True when recent positions show continuous movement above `speedKmh` for
 * at least `windowSeconds`. Positions must be in ascending time order.
 */
export function isMovingForThreshold(
  points: PositionPoint[],
  speedKmh: number,
  windowSeconds: number,
): boolean {
  if (points.length < 2) return false;
  const first = new Date(points[0].timestamp).getTime();
  const last = new Date(points[points.length - 1].timestamp).getTime();
  if ((last - first) / 1000 < windowSeconds) return false;
  return points.every((p) => (p.speed ?? 0) > speedKmh);
}

/**
 * True when recent positions show continuous stationary behavior (speed below
 * `maxSpeedKmh`) for at least `windowSeconds`. Positions must be in ascending
 * time order.
 */
export function isStationaryForThreshold(
  points: PositionPoint[],
  maxSpeedKmh: number,
  windowSeconds: number,
): boolean {
  if (points.length < 2) return false;
  const first = new Date(points[0].timestamp).getTime();
  const last = new Date(points[points.length - 1].timestamp).getTime();
  if ((last - first) / 1000 < windowSeconds) return false;
  return points.every((p) => (p.speed ?? 0) <= maxSpeedKmh);
}

// ─── Trip state machine (runs against supabase) ────────────────────

export type TripAction = "started" | "continued" | "ended" | "discarded" | "none";

interface TripRow {
  id: string;
  vehicle_id: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
}

interface PositionRow {
  id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string;
}

/**
 * Process trip state for a vehicle after a new position has been ingested.
 *
 * Behavior:
 *  - If an active trip exists and the vehicle has been stationary for the end
 *    threshold → close the trip. Distance is computed from positions along the
 *    trip. If below MIN_TRIP_DISTANCE_KM, the trip is discarded.
 *  - If no active trip and the vehicle has been moving for the start threshold
 *    → create a new trip, attach recent moving positions to it.
 *  - Otherwise → no action.
 */
export async function processPositionForTrips(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<TripAction> {
  // 1. Active trip lookup
  const { data: activeTripData } = await supabase
    .from("trips")
    .select("id,vehicle_id,start_time,end_time,is_active")
    .eq("vehicle_id", vehicleId)
    .eq("is_active", true)
    .maybeSingle();
  const activeTrip = activeTripData as TripRow | null;

  // 2. Fetch recent positions
  const cutoff = new Date(
    Date.now() - (TRIP_END_WINDOW_SECONDS + 30) * 1000,
  ).toISOString();
  const { data: recentData } = await supabase
    .from("positions")
    .select("id,vehicle_id,latitude,longitude,speed,timestamp")
    .eq("vehicle_id", vehicleId)
    .gte("timestamp", cutoff)
    .order("timestamp", { ascending: true });
  const recent = (recentData ?? []) as PositionRow[];

  if (recent.length === 0) return "none";

  if (activeTrip) {
    const endCutoff = Date.now() - TRIP_END_WINDOW_SECONDS * 1000;
    const lastWindow = recent.filter(
      (p) => new Date(p.timestamp).getTime() >= endCutoff,
    );
    if (
      isStationaryForThreshold(
        lastWindow,
        TRIP_END_STATIONARY_SPEED_KMH,
        TRIP_END_WINDOW_SECONDS,
      )
    ) {
      return await closeTrip(supabase, activeTrip);
    }
    return "continued";
  }

  // No active trip — check start
  const startCutoff = Date.now() - TRIP_START_WINDOW_SECONDS * 1000;
  const startWindow = recent.filter(
    (p) => new Date(p.timestamp).getTime() >= startCutoff,
  );
  if (
    isMovingForThreshold(
      startWindow,
      TRIP_START_SPEED_KMH,
      TRIP_START_WINDOW_SECONDS,
    )
  ) {
    return await startTrip(supabase, vehicleId, startWindow);
  }

  return "none";
}

async function startTrip(
  supabase: SupabaseClient,
  vehicleId: string,
  recentMovingPoints: PositionRow[],
): Promise<TripAction> {
  if (recentMovingPoints.length === 0) return "none";
  const first = recentMovingPoints[0];

  const { data: inserted } = await supabase
    .from("trips")
    .insert({
      vehicle_id: vehicleId,
      start_time: first.timestamp,
      start_latitude: first.latitude,
      start_longitude: first.longitude,
      is_active: true,
    })
    .select("id")
    .single();

  const tripId = (inserted as { id: string } | null)?.id;
  if (!tripId) return "none";

  for (const p of recentMovingPoints) {
    await supabase.from("positions").update({ trip_id: tripId }).eq("id", p.id);
  }
  return "started";
}

async function closeTrip(
  supabase: SupabaseClient,
  trip: TripRow,
): Promise<TripAction> {
  const { data: tripPointsData } = await supabase
    .from("positions")
    .select("id,vehicle_id,latitude,longitude,speed,timestamp")
    .eq("trip_id", trip.id)
    .order("timestamp", { ascending: true });
  const points = (tripPointsData ?? []) as PositionRow[];

  const distanceKm = calculateTripDistanceKm(
    points.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed,
      timestamp: p.timestamp,
    })),
  );

  if (distanceKm < MIN_TRIP_DISTANCE_KM) {
    // Discard: null trip_id on positions, delete trip
    for (const p of points) {
      await supabase.from("positions").update({ trip_id: null }).eq("id", p.id);
    }
    await supabase.from("trips").delete().eq("id", trip.id);
    return "discarded";
  }

  const last = points[points.length - 1];
  const durationMinutes =
    (new Date(last?.timestamp ?? trip.start_time).getTime() -
      new Date(trip.start_time).getTime()) /
    60000;

  await supabase
    .from("trips")
    .update({
      end_time: last?.timestamp ?? new Date().toISOString(),
      end_latitude: last?.latitude ?? null,
      end_longitude: last?.longitude ?? null,
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      is_active: false,
    })
    .eq("id", trip.id);

  return "ended";
}

/**
 * Sweep all active trips and close any that are stale.
 * Called by the /api/trips/sweep endpoint (cron-driven).
 */
export async function sweepActiveTrips(
  supabase: SupabaseClient,
): Promise<{ closed: number; discarded: number }> {
  const { data: activeTripsData } = await supabase
    .from("trips")
    .select("id,vehicle_id")
    .eq("is_active", true);

  const trips = (activeTripsData ?? []) as Array<{ id: string; vehicle_id: string }>;
  let closed = 0;
  let discarded = 0;

  for (const t of trips) {
    const action = await processPositionForTrips(supabase, t.vehicle_id);
    if (action === "ended") closed++;
    if (action === "discarded") discarded++;
  }

  return { closed, discarded };
}
