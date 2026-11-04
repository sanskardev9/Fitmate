import { requireUser } from "@/lib/server/userAuth";

const isTz = (tz) => {
  try {
    return Boolean(tz) && tz.length <= 64 && Boolean(new Intl.DateTimeFormat("en", { timeZone: tz }));
  } catch {
    return false;
  }
};

// Save this device for notifications (moves it to this user if someone else used it before).
export async function POST(request) {
  const { admin, user, error } = await requireUser(request);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const sub = body.subscription;
  const endpoint = sub?.endpoint;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1000 || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ error: "Bad subscription." }, { status: 400 });
  }
  const { error: e1 } = await admin.from("push_subscriptions").upsert(
    { endpoint, user_id: user.id, p256dh: String(sub.keys.p256dh).slice(0, 200), auth: String(sub.keys.auth).slice(0, 100), user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null },
    { onConflict: "endpoint" },
  );
  if (e1) return Response.json({ error: e1.message }, { status: 500 });
  if (isTz(body.timezone)) await admin.from("profiles").update({ timezone: body.timezone }).eq("id", user.id);
  return Response.json({ ok: true });
}

// Forget this device.
export async function DELETE(request) {
  const { admin, user, error } = await requireUser(request);
  if (error) return error;
  const { endpoint } = await request.json().catch(() => ({}));
  if (typeof endpoint !== "string") return Response.json({ error: "Bad request." }, { status: 400 });
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return Response.json({ ok: true });
}
