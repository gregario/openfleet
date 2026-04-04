import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { createVehicleSchema } from "@/lib/validators";

export async function GET() {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch vehicles with latest position (stored on vehicle row during ingestion)
  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id, name, make, model, year, license_plate, color, status, odometer, motion_state, traffic_light, latest_latitude, latest_longitude")
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

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const v = parsed.data;

  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .insert([
      {
        name: v.name,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin || null,
        license_plate: v.licensePlate,
        color: v.color || null,
        odometer: v.odometer,
        photo_url: v.photoUrl || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Vehicle creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ vehicle }, { status: 201 });
}
