import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Signed-in user from the "Authorization: Bearer <access token>" header.
// Returns { admin, user } or { error: Response }.
export async function requireUser(request) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: Response.json({ error: "Not configured." }, { status: 503 }) };
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: Response.json({ error: "Sign in first." }, { status: 401 }) };
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return { error: Response.json({ error: "Sign in first." }, { status: 401 }) };
  return { admin, user: data.user };
}
