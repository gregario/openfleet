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
  const res = await fetch(`${env.APP_URL}/api/vehicles`, {
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

  const positions = vehicles.map((v) => computeNextPosition(v, 60));

  const res = await fetch(`${env.APP_URL}/api/positions`, {
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
    if (new URL(request.url).pathname !== "/tick") {
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
