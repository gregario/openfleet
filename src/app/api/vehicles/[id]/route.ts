import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { updateVehicleSchema } from "@/lib/validators";

const VEHICLE_SELECT =
  "id, name, make, model, year, vin, license_plate, color, photo_url, status, odometer, motion_state, traffic_light, latest_latitude, latest_longitude, latest_speed, latest_heading, latest_position_at, created_at, updated_at";

function mapVehicleRow(v: Record<string, unknown>) {
  return {
    id: v.id,
    name: v.name,
    make: v.make,
    model: v.model,
    year: v.year,
    vin: v.vin,
    licensePlate: v.license_plate,
    color: v.color,
    photoUrl: v.photo_url,
    status: v.status,
    odometer: v.odometer,
    motionState: v.motion_state,
    trafficLight: v.traffic_light,
    latestPosition:
      v.latest_latitude != null && v.latest_longitude != null
        ? {
            latitude: v.latest_latitude,
            longitude: v.latest_longitude,
            speed: v.latest_speed,
            heading: v.latest_heading,
            timestamp: v.latest_position_at,
          }
        : null,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
  };
}

function handleDbError(error: { code?: string; message?: string }, label: string) {
  if (error.code === "PGRST116") {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }
  console.error(`${label}:`, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: v, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_SELECT)
    .eq("id", id)
    .single();

  if (error) return handleDbError(error, "Vehicle detail error");

  return NextResponse.json({ vehicle: mapVehicleRow(v) });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  const fieldMap: Record<string, string> = {
    name: "name",
    make: "make",
    model: "model",
    year: "year",
    vin: "vin",
    licensePlate: "license_plate",
    color: "color",
    odometer: "odometer",
    status: "status",
  };

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel in parsed.data) {
      updates[snake] = (parsed.data as Record<string, unknown>)[camel];
    }
  }

  const { data: v, error } = await supabase
    .from("vehicles")
    .update(updates)
    .eq("id", id)
    .select(VEHICLE_SELECT)
    .single();

  if (error) return handleDbError(error, "Vehicle update error");

  return NextResponse.json({ vehicle: mapVehicleRow(v) });
}
