/**
 * OpenFleet GPS Simulator
 *
 * Simulates vehicle GPS positions and POSTs them to the OpenFleet API.
 * Runs as a Docker Compose service alongside the app and db.
 *
 * Configuration via environment variables:
 *   API_URL       — base URL of the OpenFleet app (default: http://localhost:3000)
 *   VEHICLE_COUNT — number of vehicles to simulate (default: 5)
 *   INTERVAL_MS   — milliseconds between position updates (default: 10000)
 */

const API_URL = process.env.API_URL || "http://localhost:3000";
const VEHICLE_COUNT = parseInt(process.env.VEHICLE_COUNT || "5", 10);
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || "10000", 10);

// Bristol, UK center coordinates — realistic for a plumbing business
const BRISTOL_CENTER = { lat: 51.4545, lng: -2.5879 };
const DRIFT_RANGE = 0.03; // roughly 3km radius

interface SimulatedVehicle {
  vehicleId: string | null; // resolved from API
  index: number;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  tripState: "driving" | "idle" | "parked";
  tripTimer: number; // ticks remaining in current state
}

// Speed profiles for different driving patterns
const SPEED_PROFILES = {
  urban: { min: 10, max: 40 },
  suburban: { min: 25, max: 60 },
  highway: { min: 50, max: 80 },
};

function randomProfile(): keyof typeof SPEED_PROFILES {
  const r = Math.random();
  if (r < 0.5) return "urban";
  if (r < 0.85) return "suburban";
  return "highway";
}

function initVehicles(count: number): SimulatedVehicle[] {
  return Array.from({ length: count }, (_, i) => ({
    vehicleId: null,
    index: i,
    lat: BRISTOL_CENTER.lat + (Math.random() - 0.5) * DRIFT_RANGE * 2,
    lng: BRISTOL_CENTER.lng + (Math.random() - 0.5) * DRIFT_RANGE * 2,
    heading: Math.random() * 360,
    speed: 0,
    tripState: "parked" as const,
    tripTimer: Math.floor(Math.random() * 5) + 1, // start with short park
  }));
}

function updatePosition(v: SimulatedVehicle): SimulatedVehicle {
  v.tripTimer--;

  // State transitions
  if (v.tripTimer <= 0) {
    if (v.tripState === "parked") {
      // Start driving
      v.tripState = "driving";
      const profile = randomProfile();
      v.speed = SPEED_PROFILES[profile].min + Math.random() * (SPEED_PROFILES[profile].max - SPEED_PROFILES[profile].min);
      v.tripTimer = Math.floor(Math.random() * 30) + 10; // 10-40 ticks driving
    } else if (v.tripState === "driving") {
      // Stop at destination
      v.tripState = "parked";
      v.speed = 0;
      v.tripTimer = Math.floor(Math.random() * 20) + 5; // 5-25 ticks parked
    }
  }

  if (v.tripState === "driving") {
    // Adjust heading — roads curve, intersections turn
    const headingDelta = (Math.random() - 0.5) * 40;
    v.heading = (v.heading + headingDelta + 360) % 360;

    // Speed variation
    v.speed = Math.max(5, Math.min(80, v.speed + (Math.random() - 0.5) * 12));

    // Move in heading direction
    const distKm = v.speed * (INTERVAL_MS / 3600000);
    const dLat = (distKm / 111) * Math.cos((v.heading * Math.PI) / 180);
    const dLng = (distKm / (111 * Math.cos((v.lat * Math.PI) / 180))) * Math.sin((v.heading * Math.PI) / 180);

    v.lat += dLat;
    v.lng += dLng;

    // Keep within service area — bounce back if straying
    if (Math.abs(v.lat - BRISTOL_CENTER.lat) > DRIFT_RANGE) {
      v.heading = (v.heading + 180) % 360;
      v.lat = BRISTOL_CENTER.lat + (Math.random() - 0.5) * DRIFT_RANGE;
    }
    if (Math.abs(v.lng - BRISTOL_CENTER.lng) > DRIFT_RANGE) {
      v.heading = (v.heading + 180) % 360;
      v.lng = BRISTOL_CENTER.lng + (Math.random() - 0.5) * DRIFT_RANGE;
    }
  }

  return v;
}

async function resolveVehicleIds(vehicles: SimulatedVehicle[]): Promise<void> {
  // Fetch vehicles from the API and assign IDs by index
  try {
    const res = await fetch(`${API_URL}/api/vehicles`);
    if (res.ok) {
      const data = await res.json();
      const vehicleList = Array.isArray(data) ? data : data.vehicles ?? [];
      for (let i = 0; i < vehicles.length && i < vehicleList.length; i++) {
        vehicles[i].vehicleId = vehicleList[i].id;
      }
      const resolved = vehicles.filter((v) => v.vehicleId).length;
      console.log(`  Resolved ${resolved}/${vehicles.length} vehicle IDs from API.`);
    }
  } catch {
    // API might not have a /api/vehicles endpoint yet — fall back to DB-seeded IDs
    console.log("  Could not resolve vehicle IDs from API — will retry each tick.");
  }
}

async function postPositions(vehicles: SimulatedVehicle[]): Promise<void> {
  const withIds = vehicles.filter((v) => v.vehicleId);
  if (withIds.length === 0) {
    console.log("[sim] No vehicle IDs resolved yet — skipping POST.");
    return;
  }

  const payload = withIds.map((v) => ({
    vehicle_id: v.vehicleId!,
    latitude: Math.round(v.lat * 100000) / 100000,
    longitude: Math.round(v.lng * 100000) / 100000,
    speed: Math.round(v.speed * 10) / 10,
    heading: Math.round(v.heading),
    timestamp: new Date().toISOString(),
  }));

  try {
    const res = await fetch(`${API_URL}/api/positions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const moving = withIds.filter((v) => v.tripState === "driving").length;
      const parked = withIds.length - moving;
      console.log(`[sim] Sent ${payload.length} positions — ${data.accepted} accepted. ${moving} moving, ${parked} parked.`);
    } else {
      const text = await res.text().catch(() => "");
      console.error(`[sim] POST /api/positions failed: ${res.status} ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.error("[sim] Failed to POST positions:", err instanceof Error ? err.message : err);
  }
}

async function main() {
  console.log("=== OpenFleet GPS Simulator ===");
  console.log(`  API_URL:       ${API_URL}`);
  console.log(`  VEHICLE_COUNT: ${VEHICLE_COUNT}`);
  console.log(`  INTERVAL_MS:   ${INTERVAL_MS}`);
  console.log("");

  let vehicles = initVehicles(VEHICLE_COUNT);

  // Try to resolve vehicle IDs from the API
  await resolveVehicleIds(vehicles);

  let tickCount = 0;

  const tick = async () => {
    tickCount++;
    vehicles = vehicles.map(updatePosition);

    // Retry ID resolution every 10 ticks if any are unresolved
    if (vehicles.some((v) => !v.vehicleId) && tickCount % 10 === 0) {
      await resolveVehicleIds(vehicles);
    }

    await postPositions(vehicles);
  };

  // Initial tick
  await tick();

  // Repeating interval
  setInterval(tick, INTERVAL_MS);
}

main().catch((err) => {
  console.error("Simulator failed to start:", err);
  process.exit(1);
});
