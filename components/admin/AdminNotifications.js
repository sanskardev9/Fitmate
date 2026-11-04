"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Smartphone, Send, Flame, Dumbbell, Megaphone, CheckCircle2, AlertTriangle, Sunrise } from "lucide-react";
import { useAdminData, adminApi } from "./AdminShell";
import { card, ago, userName, Avatar, PageTitle, Stat, Section, Skeleton } from "./ui";

const KIND = {
  morning: ["Morning plan", Sunrise, "text-amber-500"],
  workout: ["Workout reminder", Dumbbell, "text-emerald-600"],
  streak_evening: ["Streak · 8 pm", Flame, "text-orange-500"],
  streak_last: ["Streak · last call", Flame, "text-rose-500"],
};
const kindOf = (k) => KIND[k] ?? (k.startsWith("broadcast") ? ["Message to everyone", Megaphone, "text-violet-500"] : k.startsWith("admin") ? ["Message to one user", Send, "text-sky-500"] : [k, Bell, "text-neutral-500"]);
const device = (ua = "") => (/iphone|ipad/i.test(ua) ? "iPhone" : /android/i.test(ua) ? "Android" : /mac/i.test(ua) ? "Mac" : /windows/i.test(ua) ? "Windows" : "Browser");

export default function AdminNotifications() {
  const { users } = useAdminData();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ title: "", body: "", url: "/home", userId: "" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const load = () => adminApi("/api/admin/push").then(setData).catch((e) => setNote({ ok: false, text: e.message }));
  useEffect(() => {
    load();
  }, []);

  const byId = useMemo(() => Object.fromEntries((users ?? []).map((u) => [u.user_id, u])), [users]);
  if (!data) return (<><PageTitle title="Notifications" sub="Reminders and messages" /><Skeleton className="h-96" /></>);

  const userIds = new Set(data.devices.map((d) => d.user_id));
  const today = new Date().toISOString().slice(0, 10);
  const sentToday = data.log.filter((l) => l.sent_at.slice(0, 10) === today).reduce((n, l) => n + (l.sent ?? 0), 0);
  const reach = users?.length ? Math.round((userIds.size / users.length) * 100) : 0;
  const reachable = (users ?? []).filter((u) => userIds.has(u.user_id));

  async function send(e) {
    e.preventDefault();
    if (!form.title.trim()) return setNote({ ok: false, text: "Add a title." });
    setBusy(true);
    setNote(null);
    try {
      const r = await adminApi("/api/admin/push", { method: "POST", body: JSON.stringify({ ...form, userId: form.userId || null }) });
      setNote({ ok: true, text: `Sent to ${r.sent} device${r.sent === 1 ? "" : "s"}${r.removed ? ` (${r.removed} old device${r.removed === 1 ? "" : "s"} removed)` : ""}.` });
      setForm((f) => ({ ...f, title: "", body: "" }));
      load();
    } catch (err) {
      setNote({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Notifications" sub="Who gets reminders, what went out, and messages to users" />
      {!data.configured && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Push keys aren&apos;t set on this server, so nothing can be sent yet.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users with notifications" value={userIds.size} hint={`${reach}% of users`} Icon={Bell} />
        <Stat label="Devices" value={data.devices.length} Icon={Smartphone} tone="sky" />
        <Stat label="Sent today" value={sentToday} Icon={Send} tone="violet" />
        <Stat label="Streak saves sent (30d)" value={data.log.filter((l) => l.kind.startsWith("streak")).reduce((n, l) => n + (l.sent ?? 0), 0)} Icon={Flame} tone="orange" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Send a message" sub="Shows up like any notification on their phone or computer">
          <form onSubmit={send} className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-neutral-500">To</p>
              <Recipient users={reachable} value={form.userId} onChange={(v) => setForm((f) => ({ ...f, userId: v }))} />
            </div>
            <label className="block">
              <span className="mb-1.5 flex justify-between text-xs font-semibold text-neutral-500">Title <span className="tabular-nums">{form.title.length}/80</span></span>
              <input value={form.title} maxLength={80} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="New: meal swaps are here 🍛" className="h-11 w-full rounded-xl border border-neutral-200 bg-transparent px-3 text-sm outline-none focus:border-emerald-500 dark:border-neutral-700" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex justify-between text-xs font-semibold text-neutral-500">Message <span className="tabular-nums">{form.body.length}/240</span></span>
              <textarea value={form.body} maxLength={240} rows={3} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Swap any meal for one with the same protein. Tap to try it." className="w-full resize-none rounded-xl border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-neutral-700" />
            </label>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-neutral-500">Opens</p>
              <div className="flex flex-wrap gap-1.5">
                {[["/home", "Home"], ["/workout", "Workout"], ["/diet", "Diet"], ["/streak", "Streak"], ["/progress", "Progress"], ["/plans", "Plans"]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, url: v }))} className={`h-8 rounded-full border px-3 text-xs font-semibold ${form.url === v ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800/60">
              <div className="flex gap-3 rounded-xl bg-white/90 p-3 shadow-sm dark:bg-neutral-900">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Bell className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] text-neutral-500">FitMate · now</span>
                  <span className="block text-sm font-semibold break-words">{form.title || "Title"}</span>
                  <span className="block text-sm break-words text-neutral-600 dark:text-neutral-300">{form.body || "Your message"}</span>
                </span>
              </div>
            </div>

            <button type="submit" disabled={busy || !data.configured || !userIds.size} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              <Send className="h-4 w-4" /> {busy ? "Sending…" : form.userId ? `Send to ${userName(byId[form.userId] ?? {})}` : `Send to ${userIds.size} user${userIds.size === 1 ? "" : "s"}`}
            </button>
            {note && <p className={`flex items-center gap-1.5 text-sm ${note.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}`}>{note.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{note.text}</p>}
          </form>
        </Section>

        <Section title="Automatic reminders" sub="Sent in each user's own time zone">
          <ul className="space-y-3 text-sm">
            {[
              [Sunrise, "text-amber-500", "Morning plan · 8 am", "Today's first meal and workout. Skipped when their workout reminder is already set for the morning, so they only get one."],
              [Dumbbell, "text-emerald-600", "Workout reminder", "On workout days at the time they pick (7 am by default), unless they've already done it."],
              [Flame, "text-orange-500", "Streak · 8 pm", "If they have a streak and today's plan isn't done yet. Mentions their freezes."],
              [Flame, "text-rose-500", "Streak · last call 10:30 pm", "Same check, last chance before the streak ends at midnight."],
            ].map(([Icon, tint, t, d]) => (
              <li key={t} className="flex gap-3">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tint}`} />
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="text-neutral-500">{d}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-800/50">Rest days and days already done never get a reminder. Each reminder goes out at most once a day.</p>
        </Section>
      </div>

      <Section title="Recently sent" sub="Last 30 days" className="mt-4">
        {data.log.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing sent yet.</p>
        ) : (
          <ul className="-my-2 divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.log.slice(0, 40).map((l, i) => {
              const [name, Icon, tint] = kindOf(l.kind);
              const u = l.user_id ? byId[l.user_id] : null;
              return (
                <li key={i} className="flex gap-3 py-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tint}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium break-words">{l.title}</span>
                    {l.body && <span className="block text-xs break-words text-neutral-500">{l.body}</span>}
                    <span className="mt-0.5 block text-xs text-neutral-400">
                      {name} · {u ? userName(u) : l.user_id ? "user" : "everyone"} · {ago(l.sent_at)}
                    </span>
                  </span>
                  <span className={`shrink-0 text-xs font-semibold tabular-nums ${l.sent ? "text-emerald-600" : "text-neutral-400"}`}>{l.sent ? `${l.sent} sent` : "not delivered"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Delivery events={data.events ?? []} byId={byId} />

      <Section title="Devices" sub="Where notifications are turned on" className="mt-4">
        {data.devices.length === 0 ? (
          <p className="text-sm text-neutral-500">No one has turned on notifications yet.</p>
        ) : (
          <ul className="-my-2 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
            {data.devices.map((d, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2.5">
                <span className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-neutral-400" />
                  <span className="font-medium">{byId[d.user_id] ? userName(byId[d.user_id]) : "User"}</span>
                  <span className="text-neutral-500">· {device(d.user_agent)}</span>
                </span>
                <span className="text-xs text-neutral-500">added {ago(d.created_at)}{d.last_used_at ? ` · last sent ${ago(d.last_used_at)}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

// Everyone, or one person who has notifications on (searchable list).
function Recipient({ users, value, onChange }) {
  const [one, setOne] = useState(Boolean(value));
  const [q, setQ] = useState("");
  const list = users.filter((u) => `${userName(u)} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6);
  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {[[false, `Everyone (${users.length})`], [true, "One person"]].map(([v, l]) => (
          <button key={l} type="button" onClick={() => { setOne(v); if (!v) onChange(""); }} className={`h-9 rounded-lg text-xs font-semibold ${one === v ? "bg-white shadow-sm dark:bg-neutral-950" : "text-neutral-500"}`}>
            {l}
          </button>
        ))}
      </div>
      {one && (
        <div className="mt-2 rounded-xl border border-neutral-200 p-2 dark:border-neutral-700">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="h-9 w-full rounded-lg bg-neutral-50 px-3 text-sm outline-none dark:bg-neutral-800" />
          <ul className="mt-1.5 space-y-0.5">
            {list.map((u) => (
              <li key={u.user_id}>
                <button type="button" onClick={() => onChange(u.user_id)} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left ${value === u.user_id ? "bg-emerald-500/10" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}>
                  <Avatar user={u} size="h-7 w-7 text-xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium break-words">{userName(u)}</span>
                    <span className="block text-xs break-all text-neutral-500">{u.email}</span>
                  </span>
                  {value === u.user_id && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="px-2 py-2 text-xs text-neutral-500">No one with notifications on matches.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- delivery tracking

const STEPS = [
  ["sent", "Sent"],
  ["received", "Reached device"],
  ["shown", "Shown"],
  ["clicked", "Tapped"],
];
const BAD = { failed: "Push service refused", removed: "Device unsubscribed", show_failed: "Couldn't show" };
const SETUP = { subscribed: "Turned on notifications", subscribe_failed: "Couldn't turn on", permission_denied: "Didn't allow notifications", unsupported: "Device can't show notifications" };

// Each notification's journey (sent → reached device → shown → tapped), plus setup problems.
function Delivery({ events, byId }) {
  const groups = [];
  const index = {};
  for (const e of events) {
    if (!e.push_id) {
      groups.push({ setup: true, at: e.created_at, events: [e] });
      continue;
    }
    if (!index[e.push_id]) groups.push((index[e.push_id] = { at: e.created_at, events: [] }));
    index[e.push_id].events.push(e);
  }
  return (
    <Section title="Delivery tracking" sub="Where each notification got to, last 7 days. Tap a row for details." className="mt-4">
      {groups.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing tracked yet. Send a test from Profile.</p>
      ) : (
        <ul className="-my-2 divide-y divide-neutral-100 dark:divide-neutral-800">
          {groups.slice(0, 40).map((g, i) => {
            const first = g.events[g.events.length - 1];
            const who = byId[first.user_id] ? userName(byId[first.user_id]) : "User";
            if (g.setup) {
              const bad = first.stage !== "subscribed";
              return (
                <li key={i} className="py-3">
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${bad ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>{SETUP[first.stage] ?? first.stage}</span>
                      <span className="font-medium">{who}</span>
                      <span className="text-xs text-neutral-500">{first.device} · {ago(first.created_at)}</span>
                    </summary>
                    {first.detail && <p className="mt-2 rounded-lg bg-neutral-50 p-2 font-mono text-xs break-words text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">{first.detail}</p>}
                  </details>
                </li>
              );
            }
            const has = new Set(g.events.map((e) => e.stage));
            const fail = g.events.find((e) => BAD[e.stage]);
            const sent = g.events.find((e) => e.stage === "sent" || BAD[e.stage]);
            const title = sent?.detail?.split(" · ")[0] ?? "Notification";
            // The furthest step reached decides where it stopped.
            const reached = STEPS.filter(([k]) => has.has(k)).length;
            const stuck = !fail && reached < 3 && Date.now() - new Date(g.at) > 60000 ? STEPS[reached]?.[1] : null;
            return (
              <li key={i} className="py-3">
                <details>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className="text-sm font-medium break-words">{title}</span>
                      <span className="text-xs text-neutral-500">{who} · {ago(g.at)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {fail ? (
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">{BAD[fail.stage]}</span>
                      ) : (
                        STEPS.map(([k, l], j) => (
                          <span key={k} className="flex items-center gap-1.5">
                            {j > 0 && <span className={`h-px w-3 ${has.has(k) ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"}`} />}
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${has.has(k) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"}`}>{l}</span>
                          </span>
                        ))
                      )}
                      {stuck && <span className="text-xs font-semibold text-amber-600">stopped before “{stuck}”</span>}
                    </div>
                  </summary>
                  <ol className="mt-2 space-y-1 rounded-lg bg-neutral-50 p-2 text-xs dark:bg-neutral-800/50">
                    {[...g.events].reverse().map((e, j) => (
                      <li key={j} className="break-words">
                        <span className="font-mono text-neutral-400">{new Date(e.created_at).toLocaleTimeString()}</span> <b>{e.stage}</b> · {e.device}
                        {e.detail ? <span className="text-neutral-500"> · {e.detail}</span> : null}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
