import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Server-only admin client (bypasses Row Level Security). Use only inside Route Handlers or
// Server Actions, after checking the caller is an admin; the "server-only" import makes the
// build fail if a client component imports it.
export function getSupabaseAdmin() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.supabaseUrl || !key) return null;
  return createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
