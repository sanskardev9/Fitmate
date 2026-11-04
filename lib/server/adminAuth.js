import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Admin = Supabase app_metadata.role "admin" (set server-side only; users cannot edit it).
// Returns { admin } (service client) or a Response to send back.
export async function requireAdmin(request) {
  const admin = getSupabaseAdmin();
  if (!admin) return { error: Response.json({ error: "Not configured." }, { status: 503 }) };
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: Response.json({ error: "Sign in first." }, { status: 401 }) };
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return { error: Response.json({ error: "Sign in first." }, { status: 401 }) };
  if (data.user.app_metadata?.role !== "admin") return { error: Response.json({ error: "Admins only." }, { status: 403 }) };
  return { admin, user: data.user };
}

// Consecutive active days ending today or yesterday (dates are YYYY-MM-DD, India time).
export function activityStreak(days) {
  if (!days?.length) return 0;
  const set = new Set(days.map(String));
  const fmt = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const day = new Date();
  if (!set.has(fmt(day))) day.setDate(day.getDate() - 1);
  let n = 0;
  while (set.has(fmt(day))) {
    n++;
    day.setDate(day.getDate() - 1);
  }
  return n;
}
