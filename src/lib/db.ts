import { createClient } from "@supabase/supabase-js";

// Supabase client — edge-compatible (works on Cloudflare Workers runtime).
// The prisma/schema.prisma file is still the source of truth for the DB
// schema (applied via `prisma db push`), but no runtime code uses the
// Prisma client.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
);
