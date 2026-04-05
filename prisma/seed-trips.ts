/**
 * Seeds realistic trip history using real road-following polylines from OSRM.
 *
 * Produces ~12-15 trips distributed across the fleet over the past 7 days,
 * with position points sampled along the actual route geometry. Trips are
 * marked simulated=false so they appear in the Trips tab by default.
 *
 * Usage:
 *   DATABASE_URL=<direct-url> tsx prisma/seed-trips.ts
 *
 * Idempotent: deletes any existing non-simulated trips before inserting.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Bristol, UK locations — depot + common customer/job-site coordinates
// [lng, lat] format matches OSRM input + GeoJSON
const LOCATIONS: Record<string, [number, number]> = {
  depot: [-2.5879, 51.4545], // Clearwater Plumbing depot (city center)
  clifton: [-2.6203, 51.4573], // Clifton
  bedminster: [-2.5960, 51.4396], // Bedminster
  redland: [-2.6095, 51.4747], // Redland
  easton: [-2.5576, 51.4638], // Easton
  knowle: [-2.5720, 51.4316], // Knowle
  southmead: [-2.5983, 51.4935], // Southmead
  brislington: [-2.5387, 51.4451], // Brislington
  hotwells: [-2.6135, 51.4492], // Hotwells
  stoke_bishop: [-2.6353, 51.4787], // Stoke Bishop
  st_george: [-2.5360, 51.4630], // St George
  portishead: [-2.7663, 51.4841], // Portishead (longer trip)
};

// Trip legs to generate — pairs of (from, to) location keys
// Realistic dispatch patterns: depot → customer → depot, or sequential visits
const TRIP_LEGS: Array<[keyof typeof LOCATIONS, keyof typeof LOCATIONS]> = [
  ["depot", "clifton"],
  ["clifton", "depot"],
  ["depot", "bedminster"],
  ["bedminster", "knowle"],
  ["knowle", "depot"],
  ["depot", "redland"],
  ["redland", "southmead"],
  ["southmead", "depot"],
  ["depot", "easton"],
  ["easton", "st_george"],
  ["st_george", "brislington"],
  ["brislington", "depot"],
  ["depot", "portishead"],
  ["portishead", "depot"],
  ["depot", "hotwells"],
  ["hotwells", "stoke_bishop"],
  ["stoke_bishop", "depot"],
];

interface OsrmRoute {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  distance: number; // meters
  duration: number; // seconds
}

async function fetchRoute(
  from: [number, number],
  to: [number, number],
): Promise<OsrmRoute | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`OSRM returned ${res.status} for route ${from} → ${to}`);
    return null;
  }
  const body = (await res.json()) as { routes: OsrmRoute[] };
  if (!body.routes?.length) return null;
  return body.routes[0];
}

/**
 * Interpolate position points along a polyline at fixed time intervals.
 * Given a route with N coordinates and duration T, produces ticks every
 * `intervalSeconds` with linearly-interpolated lat/lon along the line.
 */
function samplePositionsAlongRoute(
  route: OsrmRoute,
  startTime: Date,
  intervalSeconds: number,
): Array<{ lat: number; lon: number; speed: number; timestamp: Date }> {
  const coords = route.geometry.coordinates;
  if (coords.length < 2) return [];

  // Compute cumulative distances along the polyline (meters)
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = haversineMeters(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
    segmentLengths.push(d);
    totalLength += d;
  }
  const cumLengths = [0];
  for (const len of segmentLengths) cumLengths.push(cumLengths[cumLengths.length - 1] + len);

  const avgSpeedKmh = totalLength / 1000 / (route.duration / 3600); // km/h
  const samples: Array<{ lat: number; lon: number; speed: number; timestamp: Date }> = [];
  const totalDuration = route.duration;
  const numSamples = Math.max(2, Math.floor(totalDuration / intervalSeconds));

  for (let i = 0; i <= numSamples; i++) {
    const t = (i / numSamples) * totalDuration; // seconds since trip start
    const distAtT = (t / totalDuration) * totalLength; // meters

    // Find which segment we're in
    let segIdx = 0;
    while (segIdx < cumLengths.length - 1 && cumLengths[segIdx + 1] < distAtT) segIdx++;

    const segStart = cumLengths[segIdx];
    const segEnd = cumLengths[segIdx + 1] ?? segStart;
    const segProgress = segEnd > segStart ? (distAtT - segStart) / (segEnd - segStart) : 0;

    const startCoord = coords[segIdx];
    const endCoord = coords[Math.min(segIdx + 1, coords.length - 1)];
    const lon = startCoord[0] + (endCoord[0] - startCoord[0]) * segProgress;
    const lat = startCoord[1] + (endCoord[1] - startCoord[1]) * segProgress;

    // Speed variance around the average to look natural
    const speedJitter = avgSpeedKmh * (0.7 + Math.random() * 0.4);
    samples.push({
      lat,
      lon,
      speed: Math.round(speedJitter * 10) / 10,
      timestamp: new Date(startTime.getTime() + t * 1000),
    });
  }
  return samples;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function main() {
  console.log("Seeding OSRM-routed fixture trips...\n");

  const vehicles = await prisma.vehicle.findMany({
    where: { status: { not: "DECOMMISSIONED" } },
    select: { id: true, name: true },
  });
  if (vehicles.length === 0) {
    console.error("No active vehicles found — run the main seed first.");
    process.exit(1);
  }
  console.log(`  Vehicles available: ${vehicles.length}`);

  // Clear existing non-simulated trips so this script is idempotent
  const existing = await prisma.trip.count({ where: { simulated: false } });
  if (existing > 0) {
    console.log(`  Clearing ${existing} existing non-simulated trips...`);
    await prisma.position.updateMany({
      where: { trip: { simulated: false } },
      data: { tripId: null },
    });
    await prisma.trip.deleteMany({ where: { simulated: false } });
  }

  let inserted = 0;
  const now = Date.now();

  for (let i = 0; i < TRIP_LEGS.length; i++) {
    const [fromKey, toKey] = TRIP_LEGS[i];
    const from = LOCATIONS[fromKey];
    const to = LOCATIONS[toKey];

    console.log(`  [${i + 1}/${TRIP_LEGS.length}] ${fromKey} → ${toKey}...`);
    const route = await fetchRoute(from, to);
    if (!route) {
      console.log(`    skipped (no route)`);
      continue;
    }

    // Distribute trip start times across the last 7 days, working backwards
    const hoursAgo = (TRIP_LEGS.length - i) * (7 * 24 / TRIP_LEGS.length) + Math.random() * 4;
    const startTime = new Date(now - hoursAgo * 3600 * 1000);

    // Pick a vehicle — rotate through active fleet
    const vehicle = vehicles[i % vehicles.length];

    // Sample positions every 10 seconds along the route
    const samples = samplePositionsAlongRoute(route, startTime, 10);
    if (samples.length < 2) continue;

    const distanceKm = route.distance / 1000;
    const durationMinutes = route.duration / 60;
    const endTime = samples[samples.length - 1].timestamp;
    const startLat = samples[0].lat;
    const startLon = samples[0].lon;
    const endLat = samples[samples.length - 1].lat;
    const endLon = samples[samples.length - 1].lon;

    // Create trip + positions in a transaction
    const trip = await prisma.trip.create({
      data: {
        vehicleId: vehicle.id,
        startTime,
        endTime,
        distanceKm,
        durationMinutes,
        startLatitude: startLat,
        startLongitude: startLon,
        endLatitude: endLat,
        endLongitude: endLon,
        isActive: false,
        simulated: false,
      },
    });

    // Bulk insert positions (in chunks of 100 to avoid huge queries)
    const positionRows = samples.map((s, idx) => ({
      vehicleId: vehicle.id,
      tripId: trip.id,
      latitude: s.lat,
      longitude: s.lon,
      speed: s.speed,
      heading: idx > 0 ? computeHeading(samples[idx - 1], s) : 0,
      timestamp: s.timestamp,
    }));
    for (let c = 0; c < positionRows.length; c += 100) {
      await prisma.position.createMany({ data: positionRows.slice(c, c + 100) });
    }

    inserted++;
    console.log(
      `    ✓ ${vehicle.name}: ${distanceKm.toFixed(1)}km, ${Math.round(durationMinutes)}min, ${samples.length} points`,
    );

    // Respect OSRM public demo rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n=== Seeded ${inserted} trips ===`);
  await prisma.$disconnect();
}

function computeHeading(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lon - from.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
