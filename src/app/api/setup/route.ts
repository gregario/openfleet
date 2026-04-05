import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const setupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * GET /api/setup — returns { needsSetup: boolean }
 * Used by the setup page to check whether an admin account already exists.
 */
export async function GET() {
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "ADMIN");

  if (error) {
    console.error("Setup check failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ needsSetup: (count ?? 0) === 0 });
}

/**
 * POST /api/setup — create the first admin account.
 * Only works when no admin users exist. Idempotent-failure: returns 409 if
 * an admin already exists.
 */
export async function POST(request: Request) {
  const { count, error: countError } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "ADMIN");

  if (countError) {
    console.error("Setup check failed:", countError);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Setup has already been completed" },
      { status: 409 },
    );
  }

  const body = await request.json();
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const { error } = await supabase.from("users").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    password_hash: passwordHash,
    role: "ADMIN",
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? "";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }
    console.error("Setup failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
