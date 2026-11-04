import { requireUser } from "@/lib/server/userAuth";
import { sendPush } from "@/lib/server/push";

// "Send a test" from Profile: one notification to this user's devices.
export async function POST(request) {
  const { admin, user, error } = await requireUser(request);
  if (error) return error;
  try {
    const { data: p } = await admin.from("profiles").select("full_name, notify_workout, notify_workout_time, notify_streak, streak_current").eq("id", user.id).maybeSingle();
    const name = (p?.full_name ?? "").trim().split(/\s+/)[0];
    const [h, m] = String(p?.notify_workout_time ?? "07:00").split(":").map(Number);
    const time = new Date(Date.UTC(2000, 0, 1, h, m || 0)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
    const parts = [p?.notify_workout !== false ? `workout reminders at ${time}` : null, p?.notify_streak !== false ? "streak check-ins at 8 pm and 10:30 pm" : null].filter(Boolean);
    const r = await sendPush(admin, [user.id], {
      title: name ? `You're all set, ${name}` : "You're all set",
      body: parts.length ? `Expect ${parts.join(", and ")}. Only on days you have something planned, and never once you're done.` : "Reminders are off. You'll still get rest timer alerts.",
      url: "/home",
      tag: "test",
      image: `/api/push/image?${new URLSearchParams({ k: "streak", n: String(p?.streak_current ?? 0), f: "" })}`,
      actions: [{ action: "open", title: "Open FitMate" }],
    });
    if (!r.sent) return Response.json({ error: "No device is set up for notifications yet." }, { status: 404 });
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
