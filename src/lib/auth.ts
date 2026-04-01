import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getSession, type SessionData } from "@/lib/session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }
  return { userId: session.userId, role: session.role, name: session.name };
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId || session.role !== "ADMIN") {
    redirect("/login");
  }
  return { userId: session.userId, role: session.role, name: session.name };
}

export async function requireDriver(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId || session.role !== "DRIVER") {
    redirect("/login");
  }
  return { userId: session.userId, role: session.role, name: session.name };
}

/**
 * API route auth: returns session data or null (no redirect).
 * Use in API route handlers where redirect() is inappropriate.
 */
export async function getApiSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return { userId: session.userId, role: session.role, name: session.name };
}

/**
 * Check for a valid API key in the X-API-Key header.
 * Used by the simulator to authenticate position ingestion.
 */
export function isValidApiKey(request: Request): boolean {
  const apiKey = process.env.POSITION_API_KEY;
  if (!apiKey) return false;
  const provided = request.headers.get("X-API-Key");
  return provided === apiKey;
}
