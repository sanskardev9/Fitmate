import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { deviceLabel, logPushEvents } from "@/lib/server/push";

const UUID = /^[0-9a-f-]{36}$/i;
const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : undefined);

// "In 1 hour" button on a notification. The service worker proves who it is with its push
// endpoint; the reminder is stored and the reminder job sends it again when it's due.
export async function POST(request) {
  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ error: "Not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.endpoint !== "string") return Response.json({ error: "Unknown device." }, { status: 401 });
  const { data: sub } = await admin.from("push_subscriptions").select("user_id, user_agent").eq("endpoint", body.endpoint).maybeSingle();
  if (!sub) return Response.json({ error: "Unknown device." }, { status: 401 });

  // At most 3 waiting snoozes per person.
  const { count } = await admin.from("push_snoozes").select("id", { count: "exact", head: true }).eq("user_id", sub.user_id).is("sent_at", null);
  if ((count ?? 0) >= 3) return Response.json({ error: "Too many snoozes." }, { status: 429 });

  const p = body.payload ?? {};
  const url = typeof p.url === "string" && p.url.startsWith("/") && !p.url.startsWith("//") ? p.url.slice(0, 200) : "/home";
  const payload = { title: clip(p.title, 120) ?? "Reminder", body: clip(p.body, 300) ?? "", url, image: clip(p.image, 400), kind: clip(p.kind, 32), snoozed: true };
  await admin.from("push_snoozes").insert({ user_id: sub.user_id, due_at: new Date(Date.now() + 60 * 60000).toISOString(), payload });
  await logPushEvents(admin, [{ push_id: UUID.test(body.pid ?? "") ? body.pid : null, user_id: sub.user_id, device: deviceLabel(body.endpoint, sub.user_agent), stage: "snoozed", detail: `${payload.title} · again in 1 hour` }]);
  return Response.json({ ok: true });
}
