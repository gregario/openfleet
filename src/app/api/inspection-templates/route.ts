import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  vehicleType: z.string().max(50).optional().nullable(),
  frequencyDays: z.number().int().positive().optional().nullable(),
  items: z.array(z.string().min(1).max(200)).min(1).max(100),
});

export async function GET() {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: templates } = await supabase
    .from("inspection_templates")
    .select("id,name,description,vehicle_type,frequency_days,is_active,created_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: items } = await supabase
    .from("inspection_template_items")
    .select("id,template_id,label,sort_order")
    .order("sort_order", { ascending: true });

  const itemsByTemplate = new Map<string, Array<{ label: string; sort_order: number }>>();
  for (const it of (items ?? []) as Array<{ template_id: string; label: string; sort_order: number }>) {
    const arr = itemsByTemplate.get(it.template_id) ?? [];
    arr.push({ label: it.label, sort_order: it.sort_order });
    itemsByTemplate.set(it.template_id, arr);
  }

  const enriched = (templates ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    items: itemsByTemplate.get(t.id as string) ?? [],
  }));

  return NextResponse.json({ templates: enriched });
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

  const { data: template, error } = await supabase
    .from("inspection_templates")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      vehicle_type: parsed.data.vehicleType ?? null,
      frequency_days: parsed.data.frequencyDays ?? null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !template) {
    console.error("Failed to create template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const templateId = (template as { id: string }).id;
  const itemRows = parsed.data.items.map((label, idx) => ({
    template_id: templateId,
    label,
    sort_order: idx,
  }));

  const { error: itemsError } = await supabase.from("inspection_template_items").insert(itemRows);

  if (itemsError) {
    console.error("Failed to create template items:", itemsError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ template: { id: templateId } }, { status: 201 });
}
