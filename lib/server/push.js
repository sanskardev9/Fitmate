import "server-only";
import { randomUUID } from "node:crypto";
import webpush from "web-push";

let ready = null;
function init() {
  if (ready !== null) return ready;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  ready = Boolean(pub && priv);
  if (ready) webpush.setVapidDetails(`mailto:${process.env.MAIL_FROM_EMAIL || "noreply@fitmateapp.vercel.app"}`, pub, priv);
  return ready;
}

export const pushConfigured = () => init();

// Short, readable device label: push service + browser (never the full endpoint).
export function deviceLabel(endpoint = "", userAgent = "") {
  const service = /fcm\.googleapis/.test(endpoint) ? "Google push" : /push\.apple/.test(endpoint) ? "Apple push" : /mozilla/.test(endpoint) ? "Mozilla push" : /windows|wns/.test(endpoint) ? "Windows push" : "push";
  const os = /iphone|ipad/i.test(userAgent) ? "iPhone" : /android/i.test(userAgent) ? "Android" : /mac os/i.test(userAgent) ? "Mac" : /windows/i.test(userAgent) ? "Windows" : /linux/i.test(userAgent) ? "Linux" : "";
  const browser = /edg\//i.test(userAgent) ? "Edge" : /firefox/i.test(userAgent) ? "Firefox" : /chrome/i.test(userAgent) ? "Chrome" : /safari/i.test(userAgent) ? "Safari" : "";
  return [os, browser].filter(Boolean).join(" · ") + ` (${service} …${endpoint.slice(-6)})`;
}

// Record delivery steps; logging must never break sending.
export async function logPushEvents(admin, rows) {
  if (!rows.length) return;
  try {
    await admin.from("push_events").insert(rows.map((r) => ({ ...r, detail: r.detail ? String(r.detail).slice(0, 500) : null })));
  } catch {}
}

// Sends one notification to every device of the given users (or everyone when userIds is null).
// Each device gets its own push id; the device reports received/shown/clicked against it.
// Devices the browser has dropped (404/410) are removed. Returns { sent, failed, removed }.
export async function sendPush(admin, userIds, payload, { urgency = "normal", ttl = 6 * 3600 } = {}) {
  if (!init()) throw new Error("Push is not configured.");
  let q = admin.from("push_subscriptions").select("endpoint, user_id, p256dh, auth, user_agent");
  if (userIds) {
    if (!userIds.length) return { sent: 0, failed: 0, removed: 0 };
    q = q.in("user_id", userIds);
  }
  const { data: subs, error } = await q;
  if (error) throw error;

  const out = { sent: 0, failed: 0, removed: 0, users: new Set() };
  const dead = [];
  const events = [];
  await Promise.all(
    subs.map(async (s) => {
      const pid = randomUUID();
      const base = { push_id: pid, user_id: s.user_id, device: deviceLabel(s.endpoint, s.user_agent) };
      try {
        const res = await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...payload, pid }), { TTL: ttl, urgency });
        out.sent++;
        out.users.add(s.user_id);
        events.push({ ...base, stage: "sent", detail: `${payload.title} · push service answered ${res.statusCode}` });
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          dead.push(s.endpoint);
          events.push({ ...base, stage: "removed", detail: `${payload.title} · device no longer subscribed (${e.statusCode})` });
        } else {
          out.failed++;
          events.push({ ...base, stage: "failed", detail: `${payload.title} · ${e.statusCode ?? ""} ${e.body || e.message}`.trim() });
        }
      }
    }),
  );
  await logPushEvents(admin, events);
  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", dead);
    out.removed = dead.length;
  }
  if (out.sent) {
    await admin
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .in("endpoint", subs.map((s) => s.endpoint).filter((e) => !dead.includes(e)));
  }
  return { sent: out.sent, failed: out.failed, removed: out.removed, users: out.users.size };
}
