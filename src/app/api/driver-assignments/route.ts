import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  userId: z.string().min(1),
  vehicleId: z.string().min(1),
  type: z.enum(["ASSIGNED", "POOL"]).default("ASSIGNED"),
});

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

  // For ASSIGNED type: end any existing active assignment on this vehicle
  if (parsed.data.type === "ASSIGNED") {
    await supabase
      .from("driver_assignments")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("vehicle_id", parsed.data.vehicleId)
      .eq("is_active", true);
  }

  const { data, error } = await supabase
    .from("driver_assignments")
    .insert({
      user_id: parsed.data.userId,
      vehicle_id: parsed.data.vehicleId,
      type: parsed.data.type,
      started_at: new Date().toISOString(),
      is_active: true,
    })
    .select("id,user_id,vehicle_id,type,started_at,is_active")
    .single();

  if (error) {
    console.error("Failed to create assignment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ assignment: data }, { status: 201 });
}
