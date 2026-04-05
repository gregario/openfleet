import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";

/**
 * GET /api/trips?vehicleId=...&limit=50
 *
 * Returns a list of trips, newest first. Optionally filtered by vehicle.
 * Admin-only (driver access is handled via a dedicated /driver route).
 */
export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const vehicleId = url.searchParams.get("vehicleId");
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200);

  let query = supabase
    .from("trips")
    .select(
      "id,vehicle_id,start_time,end_time,distance_km,duration_minutes,start_latitude,start_longitude,end_latitude,end_longitude,is_active,created_at",
    )
    .order("start_time", { ascending: false })
    .limit(limit);

  if (vehicleId) {
    query = query.eq("vehicle_id", vehicleId);
  }

  // Drivers only see trips for their assigned vehicles
  if (session.role === "DRIVER") {
    const { data: assignments } = await supabase
      .from("driver_assignments")
      .select("vehicle_id")
      .eq("user_id", session.userId)
      .eq("is_active", true);
    const allowed = (assignments ?? []).map((a: { vehicle_id: string }) => a.vehicle_id);
    if (allowed.length === 0) {
      return NextResponse.json({ trips: [] });
    }
    query = query.in("vehicle_id", allowed);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch trips:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ trips: data ?? [] });
}
