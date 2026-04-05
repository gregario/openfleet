import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  vehicleId: z.string().min(1),
  type: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  fileUrl: z.string().url().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vehicleId = new URL(request.url).searchParams.get("vehicleId");

  let query = supabase
    .from("documents")
    .select("id,vehicle_id,type,name,file_url,expires_at,created_at")
    .order("expires_at", { ascending: true, nullsFirst: false });

  if (vehicleId) query = query.eq("vehicle_id", vehicleId);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ documents: data ?? [] });
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

  const { data, error } = await supabase
    .from("documents")
    .insert({
      vehicle_id: parsed.data.vehicleId,
      type: parsed.data.type,
      name: parsed.data.name,
      file_url: parsed.data.fileUrl ?? null,
      expires_at: parsed.data.expiresAt ?? null,
    })
    .select("id,vehicle_id,type,name,file_url,expires_at,created_at")
    .single();

  if (error) {
    console.error("Failed to create document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ document: data }, { status: 201 });
}
