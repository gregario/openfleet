import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("service_types")
    .select("id,name,is_default")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch service types:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ serviceTypes: data ?? [] });
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
    .from("service_types")
    .insert({ name: parsed.data.name, is_default: false })
    .select("id,name,is_default")
    .single();

  if (error) {
    const msg = (error as { message?: string }).message ?? "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "A service type with that name already exists" },
        { status: 409 },
      );
    }
    console.error("Failed to create service type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ serviceType: data }, { status: 201 });
}
