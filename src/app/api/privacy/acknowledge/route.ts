import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";

/**
 * POST /api/privacy/acknowledge
 * Marks the current user's privacy notice as acknowledged.
 */
export async function POST() {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("users")
    .update({ privacy_acked_at: new Date().toISOString() })
    .eq("id", session.userId);

  if (error) {
    console.error("Privacy ack failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
