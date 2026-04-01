/**
 * OpenFleet GPS Simulator
 *
 * Simulates vehicle GPS positions and POSTs them to the OpenFleet API.
 * Currently runs in placeholder mode — will be wired to the real API
 * once the position ingestion endpoint is built.
 */

const API_URL = process.env.API_URL || "http://localhost:3000";
const VEHICLE_COUNT = parseInt(process.env.VEHICLE_COUNT || "5", 10);
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || "10000", 10);

// Bristol, UK center coordinates
const BRISTOL_CENTER = { lat: 51.4545, lng: -2.5879 };
const DRIFT_RANGE = 0.02; // roughly 2km radius

interface SimulatedVehicle {
  index: number;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}

function initVehicles(count: number): SimulatedVehicle[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    lat: BRISTOL_CENTER.lat + (Math.random() - 0.5) * DRIFT_RANGE * 2,
    lng: BRISTOL_CENTER.lng + (Math.random() - 0.5) * DRIFT_RANGE * 2,
    heading: Math.random() * 360,
    speed: 15 + Math.random() * 45, // 15-60 km/h
  }));
}

function updatePosition(v: SimulatedVehicle): SimulatedVehicle {
  // Slightly adjust heading
  const headingDelta = (Math.random() - 0.5) * 30;
  const heading = (v.heading + headingDelta + 360) % 360;

  // Move in the heading direction
  const distKm = (v.speed * (INTERVAL_MS / 3600000));
  const dLat = (distKm / 111) * Math.cos((heading * Math.PI) / 180);
  const dLng = (distKm / (111 * Math.cos((v.lat * Math.PI) / 180))) * Math.sin((heading * Math.PI) / 180);

  // Keep within Bristol area
  let lat = v.lat + dLat;
  let lng = v.lng + dLng;
  if (Math.abs(lat - BRISTOL_CENTER.lat) > DRIFT_RANGE) lat = BRISTOL_CENTER.lat + (Math.random() - 0.5) * DRIFT_RANGE;
  if (Math.abs(lng - BRISTOL_CENTER.lng) > DRIFT_RANGE) lng = BRISTOL_CENTER.lng + (Math.random() - 0.5) * DRIFT_RANGE;

  return {
    ...v,
    lat,
    lng,
    heading,
    speed: Math.max(0, Math.min(80, v.speed + (Math.random() - 0.5) * 10)),
  };
}

async function postPosition(vehicle: SimulatedVehicle): Promise<void> {
  const payload = {
    vehicleIndex: vehicle.index,
    latitude: vehicle.lat,
    longitude: vehicle.lng,
    heading: vehicle.heading,
    speed: vehicle.speed,
    timestamp: new Date().toISOString(),
  };

  // Placeholder: log instead of POST until the API endpoint exists
  console.log(`[vehicle-${vehicle.index}] lat=${payload.latitude.toFixed(5)} lng=${payload.longitude.toFixed(5)} speed=${payload.speed.toFixed(1)}km/h heading=${payload.heading.toFixed(0)}°`);

  // TODO: Uncomment when /api/positions endpoint is ready
  // try {
  //   await fetch(`${API_URL}/api/positions`, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(payload),
  //   });
  // } catch (err) {
  //   console.error(`[vehicle-${vehicle.index}] Failed to POST position:`, err);
  // }
}

async function main() {
  console.log("=== OpenFleet GPS Simulator ===");
  console.log(`API_URL:       ${API_URL}`);
  console.log(`VEHICLE_COUNT: ${VEHICLE_COUNT}`);
  console.log(`INTERVAL_MS:   ${INTERVAL_MS}`);
  console.log("Running in placeholder mode — positions logged to stdout");
  console.log("");

  let vehicles = initVehicles(VEHICLE_COUNT);

  const tick = async () => {
    vehicles = vehicles.map(updatePosition);
    await Promise.all(vehicles.map(postPosition));
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
