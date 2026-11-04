import { requireAdmin } from "@/lib/server/adminAuth";

// One user's recent workouts and meals (admin only).
export async function GET(request, { params }) {
  const { admin, error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Bad id." }, { status: 400 });

  const { data, error: e } = await admin
    .from("user_records")
    .select("collection, data")
    .eq("user_id", id)
    .eq("deleted", false)
    .in("collection", ["workoutSessions", "sessionSets", "mealLogs"]);
  if (e) return Response.json({ error: e.message }, { status: 500 });

  const setsBySession = {};
  for (const r of data) if (r.collection === "sessionSets") setsBySession[r.data.sessionId] = (setsBySession[r.data.sessionId] ?? 0) + 1;
  const workouts = data
    .filter((r) => r.collection === "workoutSessions" && !r.data.discardedAt)
    .map((r) => ({
      name: r.data.dayName,
      startedAt: r.data.startedAt,
      finished: Boolean(r.data.finishedAt),
      minutes: r.data.finishedAt ? Math.max(1, Math.round((r.data.finishedAt - r.data.startedAt) / 60000)) : null,
      sets: setsBySession[r.data.id] ?? 0,
      planned: (r.data.plan ?? []).filter((e) => (e.section ?? "main") === "main").reduce((n, e) => n + (e.sets ?? 0), 0),
    }))
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 30);
  const meals = {};
  for (const r of data.filter((x) => x.collection === "mealLogs")) {
    const d = (meals[r.data.date] ??= { date: r.data.date, count: 0, protein: 0, calories: 0 });
    d.count++;
    d.protein += Number(r.data.proteinG) || 0;
    d.calories += Number(r.data.calories) || 0;
  }
  const mealDays = Object.values(meals)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 30);
  return Response.json({ workouts, mealDays });
}

// Permanently delete a user and everything they stored (plans, logs, profile, devices,
// feedback: all cascade from the auth user). Admins can't delete themselves or other admins.
export async function DELETE(request, { params }) {
  const { admin, user: me, error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Bad id." }, { status: 400 });
  if (id === me.id) return Response.json({ error: "You can't delete your own account here." }, { status: 400 });

  const { data: target, error: e1 } = await admin.auth.admin.getUserById(id);
  if (e1 || !target?.user) return Response.json({ error: "User not found." }, { status: 404 });
  if (target.user.app_metadata?.role === "admin") return Response.json({ error: "Admins can't be deleted from here." }, { status: 403 });

  const { error: e2 } = await admin.auth.admin.deleteUser(id);
  if (e2) return Response.json({ error: e2.message }, { status: 500 });
  return Response.json({ ok: true, email: target.user.email });
}
