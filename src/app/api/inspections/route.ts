import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const responseSchema = z.object({
  itemLabel: z.string().min(1).max(200),
  result: z.enum(["PASS", "FAIL", "NA"]),
  notes: z.string().max(1000).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
});

const createSchema = z.object({
  vehicleId: z.string().min(1),
  templateId: z.string().min(1),
  type: z.enum(["pre-trip", "post-trip"]).default("pre-trip"),
  notes: z.string().max(2000).optional().nullable(),
  responses: z.array(responseSchema).min(1),
});

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const vehicleId = url.searchParams.get("vehicleId");
  const userId = url.searchParams.get("userId");
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1), 200);

  let query = supabase
    .from("inspections")
    .select("id,vehicle_id,user_id,template_id,type,result,notes,submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (vehicleId) query = query.eq("vehicle_id", vehicleId);
  if (userId) query = query.eq("user_id", userId);

  // Drivers see only their own submissions
  if (session.role === "DRIVER") {
    query = query.eq("user_id", session.userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch inspections:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ inspections: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session) {
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

  // Derive overall result: FAIL if any response is FAIL, else PASS
  const overallResult = parsed.data.responses.some((r) => r.result === "FAIL") ? "FAIL" : "PASS";

  const { data: inspection, error } = await supabase
    .from("inspections")
    .insert({
      vehicle_id: parsed.data.vehicleId,
      user_id: session.userId,
      template_id: parsed.data.templateId,
      type: parsed.data.type,
      result: overallResult,
      notes: parsed.data.notes ?? null,
      submitted_at: new Date().toISOString(),
    })
    .select("id,submitted_at")
    .single();

  if (error || !inspection) {
    console.error("Failed to create inspection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const inspectionId = (inspection as { id: string }).id;
  const responseRows = parsed.data.responses.map((r) => ({
    inspection_id: inspectionId,
    item_label: r.itemLabel,
    result: r.result,
    notes: r.notes ?? null,
    photo_url: r.photoUrl ?? null,
  }));

  const { error: respErr } = await supabase.from("inspection_responses").insert(responseRows);
  if (respErr) {
    console.error("Failed to create inspection responses:", respErr);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Raise an alert if the inspection failed
  if (overallResult === "FAIL") {
    await supabase.from("alerts").insert({
      vehicle_id: parsed.data.vehicleId,
      type: "inspection_failed",
      severity: "CRITICAL",
      title: "Inspection failed",
      message: `Inspection by ${session.name} flagged one or more issues`,
      is_dismissed: false,
    });
  }

  return NextResponse.json({ inspection }, { status: 201 });
}
