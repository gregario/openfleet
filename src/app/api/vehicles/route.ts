import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";

export async function GET() {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch vehicles (excluding decommissioned)
  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id, name, make, model, year, license_plate, color, status, odometer, motion_state, traffic_light")
    .neq("status", "DECOMMISSIONED")
    .order("name", { ascending: true });

  if (vehiclesError) {
    console.error("Vehicles list error:", vehiclesError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Fetch latest position per vehicle
  const vehicleIds = (vehicles ?? []).map((v: { id: string }) => v.id);
  const latestPositionByVehicle = new Map<string, { latitude: number; longitude: number }>();

  if (vehicleIds.length > 0) {
    const { data: positions, error: positionsError } = await supabase
      .from("positions")
      .select("vehicle_id, latitude, longitude, timestamp")
      .in("vehicle_id", vehicleIds)
      .order("timestamp", { ascending: false });

    if (positionsError) {
      console.error("Vehicles list error (positions):", positionsError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    // Keep only the first (most recent) position per vehicle
    for (const pos of positions ?? []) {
      if (!latestPositionByVehicle.has(pos.vehicle_id)) {
        latestPositionByVehicle.set(pos.vehicle_id, {
          latitude: pos.latitude,
          longitude: pos.longitude,
        });
      }
    }
  }

  // Map to response shape (camelCase fields to match existing API contract)
  const result = (vehicles ?? []).map((v: {
    id: string;
    name: string;
    make: string;
    model: string;
    year: number;
    license_plate: string;
    color: string;
    status: string;
    odometer: number;
    motion_state: string;
    traffic_light: string;
  }) => ({
    id: v.id,
    name: v.name,
    make: v.make,
    model: v.model,
    year: v.year,
    licensePlate: v.license_plate,
    color: v.color,
    status: v.status,
    odometer: v.odometer,
    motionState: v.motion_state,
    trafficLight: v.traffic_light,
    latestPosition: latestPositionByVehicle.get(v.id) ?? null,
  }));

  return NextResponse.json({ vehicles: result });
}
