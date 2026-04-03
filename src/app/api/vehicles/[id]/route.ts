import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";

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
    .select(
      "id, name, make, model, year, vin, license_plate, color, photo_url, status, odometer, motion_state, traffic_light, latest_latitude, latest_longitude, latest_speed, latest_heading, latest_position_at, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    console.error("Vehicle detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const vehicle = {
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

  return NextResponse.json({ vehicle });
}
