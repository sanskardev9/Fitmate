import { requireAdmin } from "@/lib/server/adminAuth";
import { sendPush, pushConfigured } from "@/lib/server/push";

// Admin: who has notifications on, what was sent, and sending a message.
export async function GET(request) {
  const { admin, error } = await requireAdmin(request);
  if (error) return error;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: subs }, { data: log }, { data: events }] = await Promise.all([
    admin.from("push_subscriptions").select("user_id, user_agent, created_at, last_used_at"),
    admin.from("notification_log").select("user_id, kind, day, title, body, sent, sent_at").gte("sent_at", since).order("sent_at", { ascending: false }).limit(200),
    admin.from("push_events").select("push_id, user_id, device, stage, detail, created_at").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("created_at", { ascending: false }).limit(400),
  ]);
  return Response.json({ configured: pushConfigured(), devices: subs ?? [], log: log ?? [], events: events ?? [] });
}

export async function POST(request) {
  const { admin, error } = await requireAdmin(request);
  if (error) return error;
  const { title, body, url, userId } = await request.json().catch(() => ({}));
  const t = String(title ?? "").trim().slice(0, 80);
  const b = String(body ?? "").trim().slice(0, 240);
  const link = typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url.slice(0, 200) : "/home";
  if (!t) return Response.json({ error: "Add a title." }, { status: 400 });
  if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) return Response.json({ error: "Bad user." }, { status: 400 });
  try {
    const res = await sendPush(admin, userId ? [userId] : null, { title: t, body: b, url: link, tag: "admin" });
    await admin.from("notification_log").insert({ user_id: userId || null, kind: userId ? `admin:${Date.now()}` : `broadcast:${Date.now()}`, day: new Date().toISOString().slice(0, 10), title: t, body: b, sent: res.sent });
    return Response.json(res);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
