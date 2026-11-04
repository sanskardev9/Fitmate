import { requireUser } from "@/lib/server/userAuth";
import { sendPush } from "@/lib/server/push";

// "Send a test" from Profile: one notification to this user's devices.
export async function POST(request) {
  const { admin, user, error } = await requireUser(request);
  if (error) return error;
  try {
    const { data: p } = await admin.from("profiles").select("full_name, notify_workout, notify_workout_time, notify_streak, streak_current").eq("id", user.id).maybeSingle();
    const name = (p?.full_name ?? "").trim().split(/\s+/)[0];
    const r = await sendPush(admin, [user.id], {
      title: name ? `You're in, ${name}` : "You're in",
      body: "We've got your back. And your streak.",
      url: "/home",
      tag: "test",
      image: `/api/push/image?${new URLSearchParams({ k: "streak", n: String(p?.streak_current ?? 0), f: "" })}`,
      actions: [{ action: "open", title: "Let's go" }],
    });
    if (!r.sent) return Response.json({ error: "No device is set up for notifications yet." }, { status: 404 });
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
