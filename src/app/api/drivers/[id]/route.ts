import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
  licenseNumber: z.string().max(50).optional().nullable(),
  licenseExpiry: z.string().datetime().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { data: driver, error } = await supabase
    .from("users")
    .select("id,name,email,phone,license_number,license_expiry,created_at")
    .eq("id", id)
    .eq("role", "DRIVER")
    .maybeSingle();

  if (error || !driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  // Assignment history
  const { data: assignments } = await supabase
    .from("driver_assignments")
    .select("id,vehicle_id,type,started_at,ended_at,is_active")
    .eq("user_id", id)
    .order("started_at", { ascending: false });

  // Pull vehicle names for assignments
  const vehicleIds = Array.from(
    new Set((assignments ?? []).map((a: { vehicle_id: string }) => a.vehicle_id)),
  );
  const { data: vehiclesData } = await supabase
    .from("vehicles")
    .select("id,name,license_plate")
    .in("id", vehicleIds.length > 0 ? vehicleIds : ["__empty__"]);
  const vehicleMap = new Map(
    ((vehiclesData ?? []) as Array<{ id: string; name: string; license_plate: string }>).map(
      (v) => [v.id, v],
    ),
  );

  const enriched = (assignments ?? []).map((a: Record<string, unknown>) => ({
    ...a,
    vehicle_name: vehicleMap.get(a.vehicle_id as string)?.name ?? null,
    vehicle_license_plate: vehicleMap.get(a.vehicle_id as string)?.license_plate ?? null,
  }));

  return NextResponse.json({ driver, assignments: enriched });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.licenseNumber !== undefined) updates.license_number = parsed.data.licenseNumber;
  if (parsed.data.licenseExpiry !== undefined) updates.license_expiry = parsed.data.licenseExpiry;

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .eq("role", "DRIVER");

  if (error) {
    console.error("Failed to update driver:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
