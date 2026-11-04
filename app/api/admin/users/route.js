import { requireAdmin, activityStreak } from "@/lib/server/adminAuth";

// All users with profile, activity and their plans (admin only).
export async function GET(request) {
  const { admin, error } = await requireAdmin(request);
  if (error) return error;

  const [{ data: rows, error: e1 }, { data: plans, error: e2 }] = await Promise.all([
    admin.from("admin_user_activity").select("*").order("created_at", { ascending: false }),
    admin.from("user_records").select("user_id, collection, data").in("collection", ["workoutPlans", "dietPlans"]).eq("deleted", false),
  ]);
  if (e1 || e2) return Response.json({ error: (e1 ?? e2).message }, { status: 500 });

  const byUser = {};
  for (const p of plans) (byUser[p.user_id] ??= []).push({ id: p.data?.id, kind: p.collection === "workoutPlans" ? "workout" : "diet", name: p.data?.name ?? "Untitled", archived: Boolean(p.data?.archived), createdAt: p.data?.createdAt ?? null });

  const users = rows.map((r) => {
    const days = r.active_days ?? [];
    const last14 = new Set(Array.from({ length: 14 }, (_, i) => new Date(Date.now() - i * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })));
    return {
      ...r,
      active_days: days,
      // The device's own count (plan-based, with freezes) when it reported in the last 2 days.
      streak: r.streak_day && Date.now() - new Date(r.streak_day) < 2.5 * 86400000 ? r.streak_current : activityStreak(days),
      active_last_14: days.filter((d) => last14.has(String(d))).length,
      plans: byUser[r.user_id] ?? [],
    };
  });
  return Response.json({ users });
}
