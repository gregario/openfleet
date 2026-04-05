import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

// e.g. "08:00" / "18:30"
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  userId: z.string().min(1),
  trackingEnabled: z.boolean().optional(),
  trackingScheduleStart: z.string().regex(timePattern).optional().nullable(),
  trackingScheduleEnd: z.string().regex(timePattern).optional().nullable(),
});

/**
 * POST /api/privacy/schedule (admin)
 * Configures tracking schedule for a driver.
 */
export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.trackingEnabled !== undefined) updates.tracking_enabled = parsed.data.trackingEnabled;
  if (parsed.data.trackingScheduleStart !== undefined) updates.tracking_schedule_start = parsed.data.trackingScheduleStart;
  if (parsed.data.trackingScheduleEnd !== undefined) updates.tracking_schedule_end = parsed.data.trackingScheduleEnd;

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", parsed.data.userId)
    .eq("role", "DRIVER");

  if (error) {
    console.error("Privacy schedule update failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
