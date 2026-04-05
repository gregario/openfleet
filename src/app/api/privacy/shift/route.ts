import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ onShift: z.boolean() });

/**
 * POST /api/privacy/shift
 * Driver-initiated toggle for shift state. When off-shift, tracking is paused.
 */
export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    on_shift: parsed.data.onShift,
  };
  if (!parsed.data.onShift) {
    updates.shift_ended_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", session.userId);

  if (error) {
    console.error("Shift toggle failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, onShift: parsed.data.onShift });
}
