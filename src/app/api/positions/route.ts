import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { positionBatchSchema } from "@/lib/validators";
import { emitPositionUpdates, type PositionUpdate } from "@/lib/position-events";
import { getApiSession, isValidApiKey } from "@/lib/auth";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { processPositionForTrips } from "@/lib/trips";

export async function POST(request: Request) {
  // Rate limit: 100 requests/minute per IP
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`positions:${ip}`, 100, 60_000);
  if (!allowed) return rateLimitResponse(60);

  // Require either admin session or valid API key (for simulator)
  const session = await getApiSession();
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = positionBatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const positions = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

  // Validate all vehicle IDs exist
  const vehicleIds = Array.from(new Set(positions.map((p) => p.vehicle_id)));
  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id")
    .in("id", vehicleIds)
    .eq("status", "ACTIVE");

  if (vehiclesError) {
    console.error("Position ingestion error:", vehiclesError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const validIds = new Set((vehicles ?? []).map((v: { id: string }) => v.id));
  const validPositions = positions.filter((p) => validIds.has(p.vehicle_id));

  if (validPositions.length === 0) {
    return NextResponse.json(
      { error: "No valid vehicle IDs found" },
      { status: 404 },
    );
  }

  // Insert positions
  const { error: insertError } = await supabase.from("positions").insert(
    validPositions.map((p) => ({
      vehicle_id: p.vehicle_id,
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed ?? null,
      heading: p.heading ?? null,
      timestamp: new Date(p.timestamp).toISOString(),
    })),
  );

  if (insertError) {
    console.error("Position ingestion error:", insertError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Update vehicle motion state for each vehicle based on latest position
  const latestByVehicle = new Map<string, (typeof validPositions)[0]>();
  for (const p of validPositions) {
    const existing = latestByVehicle.get(p.vehicle_id);
    if (!existing || p.timestamp > existing.timestamp) {
      latestByVehicle.set(p.vehicle_id, p);
    }
  }

  function computeMotionState(speed: number): "MOVING" | "IDLE" | "PARKED" {
    if (speed > 5) return "MOVING";
    if (speed > 0.5) return "IDLE";
    return "PARKED";
  }

  await Promise.all(
    Array.from(latestByVehicle.entries()).map(([vehicleId, pos]) => {
      const motionState = computeMotionState(pos.speed ?? 0);
      return supabase
        .from("vehicles")
        .update({
          motion_state: motionState,
          latest_latitude: pos.latitude,
          latest_longitude: pos.longitude,
          latest_speed: pos.speed ?? null,
          latest_heading: pos.heading ?? null,
          latest_position_at: new Date(pos.timestamp).toISOString(),
        })
        .eq("id", vehicleId);
    }),
  );

  // Emit position updates to SSE subscribers
  const updates: PositionUpdate[] = Array.from(latestByVehicle.entries()).map(
    ([vehicleId, pos]) => ({
      vehicleId,
      latitude: pos.latitude,
      longitude: pos.longitude,
      speed: pos.speed ?? null,
      heading: pos.heading ?? null,
      motionState: computeMotionState(pos.speed ?? 0),
      timestamp: new Date(pos.timestamp).toISOString(),
    }),
  );
  emitPositionUpdates(updates);

  // Trip detection — open/close trips based on new positions for each vehicle
  await Promise.all(
    Array.from(latestByVehicle.keys()).map((vehicleId) =>
      processPositionForTrips(supabase, vehicleId).catch((err) => {
        console.error(`Trip detection failed for vehicle ${vehicleId}:`, err);
      }),
    ),
  );

  return NextResponse.json({
    accepted: validPositions.length,
    rejected: positions.length - validPositions.length,
  });
}
