import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";

/**
 * GET /api/trips/[id]
 *
 * Returns a single trip plus all its position points (for rendering the
 * route as a polyline on the map).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select(
      "id,vehicle_id,start_time,end_time,distance_km,duration_minutes,start_latitude,start_longitude,end_latitude,end_longitude,is_active",
    )
    .eq("id", id)
    .maybeSingle();

  if (tripError) {
    console.error("Failed to fetch trip:", tripError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const { data: positions } = await supabase
    .from("positions")
    .select("latitude,longitude,speed,timestamp")
    .eq("trip_id", id)
    .order("timestamp", { ascending: true });

  return NextResponse.json({
    trip,
    positions: positions ?? [],
  });
}
