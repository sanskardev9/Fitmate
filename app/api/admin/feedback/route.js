import { requireAdmin } from "@/lib/server/adminAuth";

// All feedback with who sent it (admin only). PATCH updates status / website visibility.
export async function GET(request) {
  const { admin, error } = await requireAdmin(request);
  if (error) return error;
  const [{ data: rows, error: e }, { data: people }] = await Promise.all([
    admin.from("feedback").select("*").order("created_at", { ascending: false }).limit(500),
    admin.from("admin_user_activity").select("user_id, email, full_name"),
  ]);
  if (e) return Response.json({ error: e.message }, { status: 500 });
  const who = Object.fromEntries((people ?? []).map((p) => [p.user_id, p]));
  return Response.json({ feedback: rows.map((r) => ({ ...r, email: who[r.user_id]?.email ?? null, name: who[r.user_id]?.full_name ?? null })) });
}

export async function PATCH(request) {
  const { admin, error } = await requireAdmin(request);
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const changes = {};
  if (["new", "read", "done"].includes(body?.status)) changes.status = body.status;
  if (typeof body?.is_public === "boolean") changes.is_public = body.is_public;
  if (!body?.id || !Object.keys(changes).length) return Response.json({ error: "Nothing to change." }, { status: 400 });
  const { error: e } = await admin.from("feedback").update(changes).eq("id", body.id);
  if (e) return Response.json({ error: e.message }, { status: 500 });
  return Response.json({ ok: true });
}
