import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  vehicleType: z.string().max(50).optional().nullable(),
  frequencyDays: z.number().int().positive().optional().nullable(),
  items: z.array(z.string().min(1).max(200)).min(1).max(100).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { data: template } = await supabase
    .from("inspection_templates")
    .select("id,name,description,vehicle_type,frequency_days,is_active,created_at")
    .eq("id", id)
    .maybeSingle();

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("inspection_template_items")
    .select("id,label,sort_order")
    .eq("template_id", id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ template, items: items ?? [] });
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
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.vehicleType !== undefined) updates.vehicle_type = parsed.data.vehicleType;
  if (parsed.data.frequencyDays !== undefined) updates.frequency_days = parsed.data.frequencyDays;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("inspection_templates").update(updates).eq("id", id);
    if (error) {
      console.error("Template update failed:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  // Replace items if provided
  if (parsed.data.items) {
    await supabase.from("inspection_template_items").delete().eq("template_id", id);
    const rows = parsed.data.items.map((label, idx) => ({ template_id: id, label, sort_order: idx }));
    await supabase.from("inspection_template_items").insert(rows);
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
  // Soft-delete (preserves inspection history links)
  const { error } = await supabase
    .from("inspection_templates")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Template delete failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
