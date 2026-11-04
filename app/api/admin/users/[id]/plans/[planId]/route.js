import { requireAdmin } from "@/lib/server/adminAuth";

const ID = /^[0-9a-zA-Z_-]{1,128}$/;

// One plan with its days and exercises / meals, as the user built it (admin only, read-only).
export async function GET(request, { params }) {
  const { admin, error } = await requireAdmin(request);
  if (error) return error;
  const { id, planId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !ID.test(planId)) return Response.json({ error: "Bad id." }, { status: 400 });

  const { data: head, error: e1 } = await admin
    .from("user_records")
    .select("collection, data")
    .eq("user_id", id)
    .eq("id", planId)
    .eq("deleted", false)
    .in("collection", ["workoutPlans", "dietPlans"])
    .maybeSingle();
  if (e1) return Response.json({ error: e1.message }, { status: 500 });
  if (!head) return Response.json({ error: "Plan not found." }, { status: 404 });

  const kind = head.collection === "workoutPlans" ? "workout" : "diet";
  const [dayCol, itemCol] = kind === "workout" ? ["trainingDays", "exercises"] : ["dietDays", "meals"];
  const { data: rows, error: e2 } = await admin
    .from("user_records")
    .select("collection, data")
    .eq("user_id", id)
    .eq("deleted", false)
    .in("collection", [dayCol, itemCol])
    .eq("data->>planId", planId);
  if (e2) return Response.json({ error: e2.message }, { status: 500 });

  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
  const items = rows.filter((r) => r.collection === itemCol).map((r) => r.data);
  const days = rows
    .filter((r) => r.collection === dayCol)
    .map((r) => r.data)
    .sort(byOrder)
    .map((d) => ({ ...d, items: items.filter((i) => i.dayId === d.id).sort(byOrder) }));
  return Response.json({ kind, plan: head.data, days });
}
