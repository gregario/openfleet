import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  vehicleId: z.string().min(1),
  serviceTypeId: z.string().min(1),
  date: z.string().datetime(),
  odometerKm: z.number().int().nonnegative(),
  cost: z.number().nonnegative().optional().nullable(),
  vendor: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  receiptUrl: z.string().url().optional().nullable(),
});

interface ScheduleRow {
  id: string;
  interval_km: number | null;
  interval_days: number | null;
}

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const vehicleId = url.searchParams.get("vehicleId");
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 1), 500);

  let query = supabase
    .from("maintenance_records")
    .select("id,vehicle_id,service_type_id,date,odometer_km,cost,vendor,notes,receipt_url,created_at")
    .order("date", { ascending: false })
    .limit(limit);

  if (vehicleId) {
    query = query.eq("vehicle_id", vehicleId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch maintenance records:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Enrich with service type names
  const typeIds = Array.from(
    new Set((data ?? []).map((r: { service_type_id: string }) => r.service_type_id)),
  );
  const { data: types } = await supabase
    .from("service_types")
    .select("id,name")
    .in("id", typeIds.length > 0 ? typeIds : ["__empty__"]);
  const typeMap = new Map(
    ((types ?? []) as Array<{ id: string; name: string }>).map((t) => [t.id, t.name]),
  );

  const records = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    service_type_name: typeMap.get(r.service_type_id as string) ?? null,
  }));

  // Aggregate totals
  const totalCost = records.reduce(
    (sum: number, r: Record<string, unknown>) => sum + (typeof r.cost === "number" ? r.cost : 0),
    0,
  );

  return NextResponse.json({ records, totalCost });
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: record, error } = await supabase
    .from("maintenance_records")
    .insert({
      vehicle_id: parsed.data.vehicleId,
      service_type_id: parsed.data.serviceTypeId,
      date: parsed.data.date,
      odometer_km: parsed.data.odometerKm,
      cost: parsed.data.cost ?? null,
      vendor: parsed.data.vendor ?? null,
      notes: parsed.data.notes ?? null,
      receipt_url: parsed.data.receiptUrl ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create maintenance record:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Automatically reset the service schedule for this vehicle+service type
  const { data: scheduleData } = await supabase
    .from("service_schedules")
    .select("id,interval_km,interval_days")
    .eq("vehicle_id", parsed.data.vehicleId)
    .eq("service_type_id", parsed.data.serviceTypeId)
    .eq("is_active", true)
    .maybeSingle();

  const schedule = scheduleData as ScheduleRow | null;
  if (schedule) {
    const updates: Record<string, unknown> = {
      last_serviced_at: parsed.data.date,
      last_serviced_km: parsed.data.odometerKm,
    };
    if (schedule.interval_km) {
      updates.next_due_km = parsed.data.odometerKm + schedule.interval_km;
    }
    if (schedule.interval_days) {
      const next = new Date(parsed.data.date);
      next.setDate(next.getDate() + schedule.interval_days);
      updates.next_due_at = next.toISOString();
    }
    await supabase.from("service_schedules").update(updates).eq("id", schedule.id);

    // Dismiss any active alerts for this schedule
    await supabase
      .from("alerts")
      .update({ is_dismissed: true })
      .eq("type", "service_due")
      .eq("vehicle_id", parsed.data.vehicleId)
      .eq("is_dismissed", false);
  }

  // Update vehicle odometer if the service odometer is newer
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("odometer")
    .eq("id", parsed.data.vehicleId)
    .maybeSingle();
  if (vehicle && typeof (vehicle as { odometer: number }).odometer === "number") {
    if (parsed.data.odometerKm > (vehicle as { odometer: number }).odometer) {
      await supabase
        .from("vehicles")
        .update({ odometer: parsed.data.odometerKm })
        .eq("id", parsed.data.vehicleId);
    }
  }

  return NextResponse.json({ record }, { status: 201 });
}
