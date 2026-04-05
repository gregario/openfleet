import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";

/**
 * GET /api/privacy/status
 * Returns the current user's privacy/tracking state.
 */
export async function GET() {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("users")
    .select("privacy_acked_at,on_shift,tracking_enabled,tracking_schedule_start,tracking_schedule_end")
    .eq("id", session.userId)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const d = data as {
    privacy_acked_at: string | null;
    on_shift: boolean | null;
    tracking_enabled: boolean | null;
    tracking_schedule_start: string | null;
    tracking_schedule_end: string | null;
  };

  // Derive whether tracking is currently active
  let trackingActive = false;
  if (d.tracking_enabled !== false && d.on_shift === true) {
    // Check schedule window if configured
    if (d.tracking_schedule_start && d.tracking_schedule_end) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const [sh, sm] = d.tracking_schedule_start.split(":").map(Number);
      const [eh, em] = d.tracking_schedule_end.split(":").map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      // Simple same-day window (no overnight support for MVP)
      trackingActive = nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    } else {
      trackingActive = true;
    }
  }

  return NextResponse.json({
    privacyAcked: d.privacy_acked_at != null,
    onShift: d.on_shift ?? false,
    trackingEnabled: d.tracking_enabled !== false,
    trackingActive,
    trackingScheduleStart: d.tracking_schedule_start,
    trackingScheduleEnd: d.tracking_schedule_end,
  });
}
