import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendPush, pushConfigured } from "@/lib/server/push";
import { dueReminders } from "@/lib/server/reminders";

export const dynamic = "force-dynamic";

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  const got = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || got.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

// Runs every 15 minutes (Supabase pg_cron): sends the workout and streak reminders that are due.
async function run(request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin || !pushConfigured()) return Response.json({ error: "Not configured." }, { status: 503 });

  // 1. Snoozed reminders ("In 1 hour") that are now due.
  const { data: snoozes } = await admin.from("push_snoozes").select("id, user_id, payload").is("sent_at", null).lte("due_at", new Date().toISOString()).limit(200);
  let snoozed = 0;
  for (const z of snoozes ?? []) {
    await admin.from("push_snoozes").update({ sent_at: new Date().toISOString() }).eq("id", z.id).is("sent_at", null);
    const p = z.payload ?? {};
    const res = await sendPush(admin, [z.user_id], { ...p, actions: [{ action: "open", title: p.url === "/workout" ? "Start workout" : "Open FitMate" }] }, { urgency: "high", ttl: 2 * 3600 });
    snoozed += res.sent;
  }

  // 2. Scheduled reminders.
  const { data: subs, error: e1 } = await admin.from("push_subscriptions").select("user_id");
  if (e1) return Response.json({ error: e1.message }, { status: 500 });
  const ids = [...new Set(subs.map((s) => s.user_id))];
  if (!ids.length) return Response.json({ users: 0, sent: 0, snoozed });

  const { data: profiles, error: e2 } = await admin
    .from("profiles")
    .select("id, full_name, timezone, streak_current, streak_freezes, streak_day, streak_today, plan_week, notify_workout, notify_workout_time, notify_streak, notify_morning")
    .in("id", ids);
  if (e2) return Response.json({ error: e2.message }, { status: 500 });

  const now = new Date();
  const due = profiles.flatMap((p) => dueReminders(p, now).map((r) => ({ ...r, user_id: p.id })));
  if (!due.length) return Response.json({ users: ids.length, due: 0, sent: 0, snoozed });

  // Claim each reminder in the log first, so a retry or overlapping run never sends it twice.
  const { data: claimed, error: e3 } = await admin
    .from("notification_log")
    .upsert(due.map((r) => ({ user_id: r.user_id, kind: r.kind, day: r.day, title: r.title, body: r.body })), { onConflict: "user_id,kind,day", ignoreDuplicates: true })
    .select("user_id, kind, day");
  if (e3) return Response.json({ error: e3.message }, { status: 500 });

  let sent = 0;
  for (const c of claimed) {
    const r = due.find((x) => x.user_id === c.user_id && x.kind === c.kind);
    const res = await sendPush(
      admin,
      [r.user_id],
      { title: r.title, body: r.body, url: r.url, kind: r.kind, image: r.image, actions: r.actions, requireInteraction: r.requireInteraction },
      { urgency: r.kind === "workout" ? "normal" : "high", ttl: 2 * 3600 },
    );
    sent += res.sent;
    await admin.from("notification_log").update({ sent: res.sent }).match({ user_id: c.user_id, kind: c.kind, day: c.day });
  }
  return Response.json({ users: ids.length, due: due.length, claimed: claimed.length, sent, snoozed });
}

export const GET = run;
export const POST = run;
