import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession, isValidApiKey } from "@/lib/auth";
import { generateServiceAlerts } from "@/lib/alerts";

/**
 * POST /api/alerts/generate
 *
 * Scan all active service schedules and write Alert rows for anything that's
 * overdue or within its warning window. Dedupes against existing undismissed
 * alerts so repeated runs are idempotent.
 *
 * Auth: admin session OR X-API-Key header (for cron-driven invocations).
 */
export async function POST(request: Request) {
  const session = await getApiSession();
  const isAdmin = session?.role === "ADMIN";
  if (!isAdmin && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateServiceAlerts(supabase);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Alert generation failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
