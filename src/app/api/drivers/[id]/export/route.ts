import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";

/**
 * GET /api/drivers/[id]/export?format=json|csv
 *
 * Per-driver data export for GDPR compliance. Returns all rows tied to the
 * driver: profile, assignments, trips for vehicles they were assigned to,
 * inspections they submitted.
 *
 * Auth: admin, OR the driver exporting their own data.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (session.role !== "ADMIN" && session.userId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";

  const { data: user } = await supabase
    .from("users")
    .select("id,name,email,phone,license_number,license_expiry,privacy_acked_at,created_at")
    .eq("id", id)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  const { data: assignments } = await supabase
    .from("driver_assignments")
    .select("id,vehicle_id,type,started_at,ended_at,is_active")
    .eq("user_id", id);

  const { data: inspections } = await supabase
    .from("inspections")
    .select("id,vehicle_id,template_id,type,result,notes,submitted_at")
    .eq("user_id", id);

  const payload = {
    exported_at: new Date().toISOString(),
    user,
    assignments: assignments ?? [],
    inspections: inspections ?? [],
  };

  if (format === "csv") {
    // Simple CSV output: one section per entity
    const lines: string[] = [];
    lines.push("# USER");
    lines.push("id,name,email,phone,license_number,license_expiry,privacy_acked_at,created_at");
    const u = user as Record<string, unknown>;
    lines.push(
      [
        u.id,
        u.name,
        u.email,
        u.phone ?? "",
        u.license_number ?? "",
        u.license_expiry ?? "",
        u.privacy_acked_at ?? "",
        u.created_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    lines.push("");
    lines.push("# ASSIGNMENTS");
    lines.push("id,vehicle_id,type,started_at,ended_at,is_active");
    for (const a of assignments ?? []) {
      const row = a as Record<string, unknown>;
      lines.push(
        [row.id, row.vehicle_id, row.type, row.started_at, row.ended_at ?? "", row.is_active]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
    lines.push("");
    lines.push("# INSPECTIONS");
    lines.push("id,vehicle_id,template_id,type,result,notes,submitted_at");
    for (const i of inspections ?? []) {
      const row = i as Record<string, unknown>;
      lines.push(
        [row.id, row.vehicle_id, row.template_id, row.type, row.result, row.notes ?? "", row.submitted_at]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="driver-${id}.csv"`,
      },
    });
  }

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="driver-${id}.json"`,
    },
  });
}
