import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  intervalKm: z.number().int().positive().optional().nullable(),
  intervalDays: z.number().int().positive().optional().nullable(),
  warningKm: z.number().int().nonnegative().optional().nullable(),
  warningDays: z.number().int().nonnegative().optional().nullable(),
  estimatedCost: z.number().nonnegative().optional().nullable(),
  lastServicedAt: z.string().datetime().optional().nullable(),
  lastServicedKm: z.number().int().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
});

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
  if (parsed.data.intervalKm !== undefined) updates.interval_km = parsed.data.intervalKm;
  if (parsed.data.intervalDays !== undefined) updates.interval_days = parsed.data.intervalDays;
  if (parsed.data.warningKm !== undefined) updates.warning_km = parsed.data.warningKm;
  if (parsed.data.warningDays !== undefined) updates.warning_days = parsed.data.warningDays;
  if (parsed.data.estimatedCost !== undefined) updates.estimated_cost = parsed.data.estimatedCost;
  if (parsed.data.lastServicedAt !== undefined) updates.last_serviced_at = parsed.data.lastServicedAt;
  if (parsed.data.lastServicedKm !== undefined) updates.last_serviced_km = parsed.data.lastServicedKm;
  if (parsed.data.isActive !== undefined) updates.is_active = parsed.data.isActive;

  // Recompute next-due if any relevant field changed
  if (
    parsed.data.intervalKm !== undefined ||
    parsed.data.intervalDays !== undefined ||
    parsed.data.lastServicedAt !== undefined ||
    parsed.data.lastServicedKm !== undefined
  ) {
    const { data: current } = await supabase
      .from("service_schedules")
      .select("interval_km,interval_days,last_serviced_at,last_serviced_km")
      .eq("id", id)
      .maybeSingle();
    if (current) {
      const merged = {
        intervalKm: parsed.data.intervalKm ?? (current as Record<string, unknown>).interval_km as number | null,
        intervalDays: parsed.data.intervalDays ?? (current as Record<string, unknown>).interval_days as number | null,
        lastServicedKm: parsed.data.lastServicedKm ?? (current as Record<string, unknown>).last_serviced_km as number | null,
        lastServicedAt: parsed.data.lastServicedAt ?? (current as Record<string, unknown>).last_serviced_at as string | null,
      };
      if (merged.intervalKm && merged.lastServicedKm != null) {
        updates.next_due_km = merged.lastServicedKm + merged.intervalKm;
      }
      if (merged.intervalDays) {
        const base = merged.lastServicedAt ? new Date(merged.lastServicedAt) : new Date();
        base.setDate(base.getDate() + merged.intervalDays);
        updates.next_due_at = base.toISOString();
      }
    }
  }

  const { error } = await supabase
    .from("service_schedules")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Failed to update schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // Soft-delete: mark inactive (preserves history)
  const { error } = await supabase
    .from("service_schedules")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Failed to delete schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
