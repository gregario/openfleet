import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";

/**
 * DELETE /api/drivers/[id]/data
 *
 * Hard delete: removes the driver user row and all directly-owned records
 * (sessions, assignments, inspections, audit logs). Cascades handle most
 * of this via the Prisma relation definitions.
 *
 * Does NOT delete positions/trips (those are vehicle-owned, not driver-owned).
 *
 * Admin only.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Confirm it's a driver (don't allow deleting admins through this route)
  const { data: user } = await supabase
    .from("users")
    .select("id,role")
    .eq("id", id)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  if ((user as { role: string }).role !== "DRIVER") {
    return NextResponse.json(
      { error: "This endpoint only deletes drivers, not admins" },
      { status: 400 },
    );
  }

  // Cascades: sessions, driver_assignments, inspections, audit_logs
  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) {
    console.error("Driver hard delete failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
