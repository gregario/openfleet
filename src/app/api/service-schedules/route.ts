import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const createScheduleSchema = z
  .object({
    vehicleId: z.string().min(1),
    serviceTypeId: z.string().min(1),
    intervalKm: z.number().int().positive().optional().nullable(),
    intervalDays: z.number().int().positive().optional().nullable(),
    warningKm: z.number().int().nonnegative().optional().nullable(),
    warningDays: z.number().int().nonnegative().optional().nullable(),
    estimatedCost: z.number().nonnegative().optional().nullable(),
    lastServicedAt: z.string().datetime().optional().nullable(),
    lastServicedKm: z.number().int().nonnegative().optional().nullable(),
  })
  .refine((v) => v.intervalKm != null || v.intervalDays != null, {
    message: "At least one of intervalKm or intervalDays is required",
  });

function computeNextDue(input: {
  intervalKm: number | null | undefined;
  intervalDays: number | null | undefined;
  lastServicedKm: number | null | undefined;
  lastServicedAt: string | null | undefined;
}): { nextDueKm: number | null; nextDueAt: string | null } {
  const nextDueKm =
    input.intervalKm && input.lastServicedKm != null
      ? input.lastServicedKm + input.intervalKm
      : input.intervalKm
        ? input.intervalKm
        : null;

  let nextDueAt: string | null = null;
  if (input.intervalDays) {
    const base = input.lastServicedAt ? new Date(input.lastServicedAt) : new Date();
    base.setDate(base.getDate() + input.intervalDays);
    nextDueAt = base.toISOString();
  }
  return { nextDueKm, nextDueAt };
}

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vehicleId = new URL(request.url).searchParams.get("vehicleId");

  let query = supabase
    .from("service_schedules")
    .select(
      "id,vehicle_id,service_type_id,interval_km,interval_days,warning_km,warning_days,estimated_cost,last_serviced_at,last_serviced_km,next_due_at,next_due_km,is_active,created_at,updated_at",
    )
    .eq("is_active", true)
    .order("next_due_at", { ascending: true, nullsFirst: false });

  if (vehicleId) {
    query = query.eq("vehicle_id", vehicleId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Join service type names
  const typeIds = Array.from(new Set((data ?? []).map((s: { service_type_id: string }) => s.service_type_id)));
  const { data: types } = await supabase
    .from("service_types")
    .select("id,name")
    .in("id", typeIds.length > 0 ? typeIds : ["__empty__"]);
  const typeMap = new Map((types ?? []).map((t: { id: string; name: string }) => [t.id, t.name]));

  const schedules = (data ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    service_type_name: typeMap.get(s.service_type_id as string) ?? null,
  }));

  return NextResponse.json({ schedules });
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { nextDueKm, nextDueAt } = computeNextDue({
    intervalKm: parsed.data.intervalKm,
    intervalDays: parsed.data.intervalDays,
    lastServicedKm: parsed.data.lastServicedKm,
    lastServicedAt: parsed.data.lastServicedAt,
  });

  const { data, error } = await supabase
    .from("service_schedules")
    .insert({
      vehicle_id: parsed.data.vehicleId,
      service_type_id: parsed.data.serviceTypeId,
      interval_km: parsed.data.intervalKm ?? null,
      interval_days: parsed.data.intervalDays ?? null,
      warning_km: parsed.data.warningKm ?? null,
      warning_days: parsed.data.warningDays ?? null,
      estimated_cost: parsed.data.estimatedCost ?? null,
      last_serviced_at: parsed.data.lastServicedAt ?? null,
      last_serviced_km: parsed.data.lastServicedKm ?? null,
      next_due_at: nextDueAt,
      next_due_km: nextDueKm,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create schedule:", error);
    const msg = (error as { message?: string }).message ?? "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "A schedule for this service type already exists for this vehicle" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ schedule: data }, { status: 201 });
}
