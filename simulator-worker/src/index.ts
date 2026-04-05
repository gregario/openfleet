/**
 * OpenFleet GPS Simulator Worker
 *
 * Runs on a cron trigger (*\/1 * * * * — every minute) and posts one tick of
 * synthetic GPS positions per active vehicle to the main app's
 * POST /api/positions endpoint with X-Simulated: true so the resulting
 * trips get flagged as synthetic and hidden from the Trips tab by default.
 *
 * State is derived fresh each tick from the app's current vehicle list —
 * this Worker is stateless. Each vehicle gets a lat/lon that drifts from
 * wherever it was, creating motion on the live dashboard. Trip-detection
 * runs server-side on each POST so trips start/end naturally.
 */

interface Env {
  APP_URL: string;
  POSITION_API_KEY: string;
  APP: Fetcher; // service binding to openfleet-v2-staging
}

interface VehicleSummary {
  id: string;
  name: string;
  latestPosition: {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
  } | null;
  motionState: string;
}

// Bristol service area — vehicles drift inside this bounding box
const BRISTOL_CENTER = { lat: 51.4545, lon: -2.5879 };
const DRIFT_RANGE_DEG = 0.035; // ~3.5km radius

// Each vehicle has a persisted-in-DB lat/lon (from previous tick).
// We read that as "current position" and compute next position.

async function fetchVehicles(env: Env): Promise<VehicleSummary[]> {
  // Service binding: URL is ignored by Cloudflare but must be present
  const res = await env.APP.fetch("https://app/api/vehicles", {
    headers: { "X-API-Key": env.POSITION_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch vehicles: ${res.status}`);
  }
  const body = (await res.json()) as { vehicles: VehicleSummary[] };
  return body.vehicles ?? [];
}

interface NextPosition {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
}

// Number of positions to emit per vehicle per cron tick. 13 points at
// 5s spacing covers 60s ending at "now". Server-side trip-detection's
// 30s window captures 7 of those (span == 30s exactly) — enough to
// trigger on the strict `< windowSeconds` check in trips.ts.
const POSITIONS_PER_TICK = 13;
const POSITION_SPACING_SECONDS = 5;

/**
 * Variant of computeNextPosition that takes an explicit `moving` flag
 * rather than rolling its own probability. Used inside the per-tick loop
 * to keep the vehicle's movement state consistent across all positions
 * in a single batch.
 */
function computeNextPositionLocked(
  vehicle: VehicleSummary,
  tickSeconds: number,
  moving: boolean,
): NextPosition {
  let lat = vehicle.latestPosition?.latitude ?? BRISTOL_CENTER.lat + (Math.random() - 0.5) * DRIFT_RANGE_DEG * 2;
  let lon = vehicle.latestPosition?.longitude ?? BRISTOL_CENTER.lon + (Math.random() - 0.5) * DRIFT_RANGE_DEG * 2;
  let heading = vehicle.latestPosition?.heading ?? Math.random() * 360;

  let speed = 0;
  if (moving) {
    const prevSpeed = vehicle.latestPosition?.speed ?? 0;
    // If prior tick was at speed, keep close to it with jitter; otherwise
    // pick a fresh speed from a profile
    if (prevSpeed > 5) {
      speed = Math.max(6, Math.min(80, prevSpeed + (Math.random() - 0.5) * 12));
    } else {
      const r = Math.random();
      const profile = r < 0.5 ? { min: 10, max: 40 } : r < 0.85 ? { min: 25, max: 60 } : { min: 50, max: 80 };
      speed = profile.min + Math.random() * (profile.max - profile.min);
    }

    const jitter = (Math.random() - 0.5) * 20;
    heading = (heading + jitter + 360) % 360;

    const distKm = speed * (tickSeconds / 3600);
    const dLat = (distKm / 111) * Math.cos((heading * Math.PI) / 180);
    const dLon = (distKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin((heading * Math.PI) / 180);
    lat += dLat;
    lon += dLon;

    if (Math.abs(lat - BRISTOL_CENTER.lat) > DRIFT_RANGE_DEG) {
      heading = (heading + 180) % 360;
      lat = BRISTOL_CENTER.lat + (Math.random() - 0.5) * DRIFT_RANGE_DEG;
    }
    if (Math.abs(lon - BRISTOL_CENTER.lon) > DRIFT_RANGE_DEG) {
      heading = (heading + 180) % 360;
      lon = BRISTOL_CENTER.lon + (Math.random() - 0.5) * DRIFT_RANGE_DEG;
    }
  }

  return {
    vehicle_id: vehicle.id,
    latitude: Math.round(lat * 100000) / 100000,
    longitude: Math.round(lon * 100000) / 100000,
    speed: Math.round(speed * 10) / 10,
    heading: Math.round(heading),
    timestamp: new Date().toISOString(),
  };
}

function computeNextPosition(
  vehicle: VehicleSummary,
  tickSeconds: number,
): NextPosition {
  // Start from current position, or random point in Bristol area if none
  let lat = vehicle.latestPosition?.latitude ?? BRISTOL_CENTER.lat + (Math.random() - 0.5) * DRIFT_RANGE_DEG * 2;
  let lon = vehicle.latestPosition?.longitude ?? BRISTOL_CENTER.lon + (Math.random() - 0.5) * DRIFT_RANGE_DEG * 2;
  let heading = vehicle.latestPosition?.heading ?? Math.random() * 360;

  // ~30% chance of stopping this tick. When stopped, speed stays 0 and position holds.
  const wasStopped = (vehicle.motionState ?? "PARKED") !== "MOVING";
  const willMove = wasStopped ? Math.random() < 0.4 : Math.random() < 0.85;

  let speed = 0;
  if (willMove) {
    // Pick a speed profile randomly on transitions
    const r = Math.random();
    const profile = r < 0.5 ? { min: 10, max: 40 } : r < 0.85 ? { min: 25, max: 60 } : { min: 50, max: 80 };
    speed = profile.min + Math.random() * (profile.max - profile.min);

    // Small heading jitter on movement
    const jitter = (Math.random() - 0.5) * 30;
    heading = (heading + jitter + 360) % 360;

    // Move in heading direction
    const distKm = speed * (tickSeconds / 3600);
    const dLat = (distKm / 111) * Math.cos((heading * Math.PI) / 180);
    const dLon = (distKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin((heading * Math.PI) / 180);
    lat += dLat;
    lon += dLon;

    // Bounce off service-area bounds
    if (Math.abs(lat - BRISTOL_CENTER.lat) > DRIFT_RANGE_DEG) {
      heading = (heading + 180) % 360;
      lat = BRISTOL_CENTER.lat + (Math.random() - 0.5) * DRIFT_RANGE_DEG;
    }
    if (Math.abs(lon - BRISTOL_CENTER.lon) > DRIFT_RANGE_DEG) {
      heading = (heading + 180) % 360;
      lon = BRISTOL_CENTER.lon + (Math.random() - 0.5) * DRIFT_RANGE_DEG;
    }
  }

  return {
    vehicle_id: vehicle.id,
    latitude: Math.round(lat * 100000) / 100000,
    longitude: Math.round(lon * 100000) / 100000,
    speed: Math.round(speed * 10) / 10,
    heading: Math.round(heading),
    timestamp: new Date().toISOString(),
  };
}

async function tick(env: Env): Promise<{ accepted: number; vehicles: number }> {
  const vehicles = await fetchVehicles(env);
  if (vehicles.length === 0) return { accepted: 0, vehicles: 0 };

  // Generate POSITIONS_PER_TICK positions per vehicle, spaced
  // POSITION_SPACING_SECONDS apart, ending at now. Each subsequent
  // position walks forward from the last, simulating continuous driving.
  const now = Date.now();
  const positions: NextPosition[] = [];

  for (const v of vehicles) {
    // Commit to a single movement state for this entire tick, so all 6
    // positions in the batch either show moving or parked — required for
    // trip-detection's every(speed > 5) check to fire cleanly.
    const wasMoving = (v.motionState ?? "PARKED") === "MOVING";
    const willMoveThisTick = wasMoving ? Math.random() < 0.8 : Math.random() < 0.5;

    // Fake it by forcing motionState through the positions chain
    let working: VehicleSummary = {
      ...v,
      motionState: willMoveThisTick ? "MOVING" : "PARKED",
    };

    const vehiclePositions: NextPosition[] = [];
    for (let i = POSITIONS_PER_TICK - 1; i >= 0; i--) {
      const timestampMs = now - i * POSITION_SPACING_SECONDS * 1000;
      const pos = computeNextPositionLocked(working, POSITION_SPACING_SECONDS, willMoveThisTick);
      pos.timestamp = new Date(timestampMs).toISOString();
      vehiclePositions.push(pos);
      working = {
        ...working,
        latestPosition: {
          latitude: pos.latitude,
          longitude: pos.longitude,
          speed: pos.speed,
          heading: pos.heading,
        },
      };
    }
    positions.push(...vehiclePositions);
  }

  const res = await env.APP.fetch("https://app/api/positions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.POSITION_API_KEY,
      "X-Simulated": "true",
    },
    body: JSON.stringify(positions),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST /api/positions failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as { accepted: number; rejected: number };
  return { accepted: body.accepted, vehicles: vehicles.length };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      tick(env)
        .then((r) => console.log(`[simulator] tick: ${r.accepted}/${r.vehicles} positions accepted`))
        .catch((err) => console.error(`[simulator] tick failed:`, err)),
    );
  },

  // Expose a manual-trigger endpoint for testing via `wrangler dev` or curl
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/debug") {
      // Don't expose the API key — just show that it exists + URL
      return Response.json({
        APP_URL: env.APP_URL,
        POSITION_API_KEY_set: !!env.POSITION_API_KEY,
        POSITION_API_KEY_length: env.POSITION_API_KEY?.length ?? 0,
      });
    }
    if (url.pathname === "/debug-fetch") {
      const res = await env.APP.fetch("https://app/api/vehicles", {
        headers: { "X-API-Key": env.POSITION_API_KEY ?? "" },
      });
      const text = await res.text();
      return Response.json({ status: res.status, body: text.slice(0, 300) });
    }
    if (url.pathname !== "/tick") {
      return new Response("openfleet-v2-simulator\nPOST /tick to trigger manually\n", { status: 200 });
    }
    if (request.method !== "POST") {
      return new Response("POST required", { status: 405 });
    }
    try {
      const r = await tick(env);
      return Response.json(r);
    } catch (err) {
      return Response.json({ error: (err as Error).message }, { status: 500 });
    }
  },
};
