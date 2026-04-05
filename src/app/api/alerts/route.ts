import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const includeDismissed = url.searchParams.get("includeDismissed") === "true";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1), 200);

  let query = supabase
    .from("alerts")
    .select("id,vehicle_id,type,severity,title,message,is_dismissed,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!includeDismissed) {
    query = query.eq("is_dismissed", false);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch alerts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const alerts = (data ?? []).slice().sort((a: { severity: string }, b: { severity: string }) => {
    return (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
  });

  return NextResponse.json({ alerts });
}
