import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getApiSession, hashPassword } from "@/lib/auth";
import { z } from "zod";

const createDriverSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().max(30).optional().nullable(),
  licenseNumber: z.string().max(50).optional().nullable(),
  licenseExpiry: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const session = await getApiSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,phone,license_number,license_expiry,created_at")
    .eq("role", "DRIVER")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch drivers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ drivers: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createDriverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const { data, error } = await supabase
    .from("users")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      password_hash: passwordHash,
      role: "DRIVER",
      phone: parsed.data.phone ?? null,
      license_number: parsed.data.licenseNumber ?? null,
      license_expiry: parsed.data.licenseExpiry ?? null,
    })
    .select("id,name,email,phone,license_number,license_expiry")
    .single();

  if (error) {
    const msg = (error as { message?: string }).message ?? "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 },
      );
    }
    console.error("Failed to create driver:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ driver: data }, { status: 201 });
}
