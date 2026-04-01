import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";

export async function GET() {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch vehicles with latest position (stored on vehicle row during ingestion)
  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id, name, make, model, year, license_plate, color, status, odometer, motion_state, traffic_light, latest_latitude, latest_longitude")
    .neq("status", "DECOMMISSIONED")
    .order("name", { ascending: true });

  if (vehiclesError) {
    console.error("Vehicles list error:", vehiclesError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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
    latest_latitude: number | null;
    latest_longitude: number | null;
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
    latestPosition: v.latest_latitude != null && v.latest_longitude != null
      ? { latitude: v.latest_latitude, longitude: v.latest_longitude }
      : null,
  }));

  return NextResponse.json({ vehicles: result });
}
