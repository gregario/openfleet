import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getSession } from "@/lib/session";
import { verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit: 5 attempts/minute per IP
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`login:${ip}`, 5, 60_000);
  if (!allowed) return rateLimitResponse(60);

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, name, role, password_hash")
    .eq("email", email)
    .single();

  if (error || !user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  session.name = user.name;
  await session.save();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}
