import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { isValidApiKey, getApiSession } from "@/lib/auth";
import { sweepActiveTrips } from "@/lib/trips";

/**
 * POST /api/trips/sweep
 *
 * Sweeps all active trips and closes any that have been stationary beyond
 * the end threshold. Intended to be called by an external cron every ~30s
 * to handle vehicles that stop sending GPS updates (ignition off).
 *
 * Auth: admin session OR X-API-Key header (shared with positions ingestion).
 */
export async function POST(request: Request) {
  const session = await getApiSession();
  const isAdmin = session?.role === "ADMIN";
  if (!isAdmin && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sweepActiveTrips(supabase);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Trip sweep failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
