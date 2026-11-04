"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Dumbbell, Flame, Timer, Send, Share, Sunrise, Utensils, Clock, ChevronRight, ChevronDown } from "lucide-react";
import TimeDial from "@/components/common/TimeDial";
import { useAuth } from "./AuthProvider";
import { cachedProfile, fetchProfile } from "@/lib/services/profileService";
import { supabase } from "@/lib/supabase/client";
import { pushSupport, permission, currentSubscription, enablePush, disablePush, sendTestPush, trackSetup, refreshWorker } from "@/lib/push";
import Switch from "@/components/common/Switch";

const toMinutes = (t) => {
  const [h, m] = String(t ?? "07:00").split(":").map(Number);
  return h * 60 + (m || 0);
};
const toTime = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const label = (min) => new Date(2000, 0, 1, Math.floor(min / 60), min % 60).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// Profile card: turn notifications on for this device and choose which reminders to get.
export default function NotificationsCard() {
  const { user } = useAuth();
  const [support, setSupport] = useState(null);
  const [perm, setPerm] = useState("default");
  const [on, setOn] = useState(false);
  const [prefs, setPrefs] = useState({ notify_morning: true, notify_meals: true, notify_workout: true, notify_workout_time: "07:00", notify_streak: true });
  const [restOn, setRestOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [dialOpen, setDialOpen] = useState(false);
  const [expanded, setExpanded] = useState(false); // folded until tapped

  useEffect(() => {
    const s = pushSupport();
    setSupport(s);
    if (s.ok) refreshWorker();
    // Log once a day why this device can't do notifications (http, old iOS, not installed…).
    if (!s.ok && user) {
      const key = `fitmate:unsupportedLogged:${s.reason}`;
      try {
        if (localStorage.getItem(key) !== new Date().toDateString()) {
          localStorage.setItem(key, new Date().toDateString());
          trackSetup("unsupported", `${s.reason} · secure: ${window.isSecureContext} · standalone: ${s.standalone} · ${location.origin}`);
        }
      } catch {}
    }
    setPerm(permission());
    try {
      setRestOn(localStorage.getItem("fitmate:restNotify") !== "0");
    } catch {}
    currentSubscription().then((s) => setOn(Boolean(s) && permission() === "granted"));
    if (!user) return;
    const pick = (p) => p && setPrefs({ notify_morning: p.notify_morning ?? true, notify_meals: p.notify_meals ?? true, notify_workout: p.notify_workout ?? true, notify_workout_time: p.notify_workout_time ?? "07:00", notify_streak: p.notify_streak ?? true });
    pick(cachedProfile(user.id));
    fetchProfile(user.id).then(pick).catch(() => {});
  }, [user]);

  if (!support || !user) return null;

  async function turnOn() {
    setBusy(true);
    setNote(null);
    try {
      await enablePush();
      setOn(true);
      setNote({ ok: true, text: "Notifications are on for this device." });
    } catch (e) {
      setNote({ ok: false, text: e.message });
    } finally {
      setPerm(permission());
      setBusy(false);
    }
  }
  async function turnOff() {
    setBusy(true);
    await disablePush().catch(() => {});
    setOn(false);
    setBusy(false);
    setNote({ ok: true, text: "Notifications are off for this device." });
  }
  async function test() {
    setBusy(true);
    setNote(null);
    // Watch for the worker saying the push arrived, so we can tell "blocked by the computer"
    // apart from "never arrived".
    let arrived = false;
    const onMsg = (e) => {
      if (e.data?.type !== "fitmate:push" || e.data.tag !== "test") return;
      arrived = true;
      setNote({ ok: true, text: support.ios ? "Received ✓" : "Your browser received it ✓ and asked your computer to show it. No banner? Your computer is hiding this browser's notifications: on a Mac, open System Settings → Notifications → Google Chrome (or your browser), turn on Allow notifications and pick Banners. Also turn off Focus / Do Not Disturb." });
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    setTimeout(() => {
      navigator.serviceWorker?.removeEventListener("message", onMsg);
      if (!arrived) setNote((n) => (n?.ok ? { ok: false, text: "It didn't reach this browser. Tap Turn off here, then turn notifications on again." } : n));
    }, 15000);
    try {
      await sendTestPush();
      if (!arrived) setNote({ ok: true, text: "Sent. Waiting for it to arrive…" });
    } catch (e) {
      setNote({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }
  function update(fields) {
    setPrefs((p) => ({ ...p, ...fields }));
    // Plain update (the profile already exists); an upsert would trip the required-field checks.
    supabase
      .from("profiles")
      .update(fields)
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) setNote({ ok: false, text: "Couldn't save. Check your connection." });
        else setNote(null);
      });
  }
  function setRest(v) {
    setRestOn(v);
    try {
      localStorage.setItem("fitmate:restNotify", v ? "1" : "0");
    } catch {}
  }
  const minutes = toMinutes(prefs.notify_workout_time);
  const dial = dialOpen && (
    <TimeDial
      title="Workout reminder"
      value={toTime(minutes)}
      onClose={() => setDialOpen(false)}
      onSave={(t) => {
        update({ notify_workout_time: t });
        setDialOpen(false);
      }}
    />
  );

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      {dial}
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="flex w-full items-center gap-3 text-left">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"}`}>
          {on ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Notifications</span>
          <span className="block text-xs text-neutral-500">{on ? `On · workout reminder ${label(minutes)}` : "Reminders so you never lose your streak"}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {!expanded ? null : support.needsInstall ? (
        <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm dark:bg-neutral-800/50">
          <p className="font-semibold">Add FitMate to your Home Screen first</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            On iPhone, notifications only work from the Home Screen app. Tap <Share className="inline h-4 w-4 align-[-2px]" /> Share, then <b>Add to Home Screen</b>, and open FitMate from there.
          </p>
        </div>
      ) : !support.ok ? (
        <p className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">
          {support.reason === "insecure"
            ? <>Notifications only work on a secure (https) address. Open FitMate at <b>fitmateapp.vercel.app</b>{support.ios ? ", add that to your Home Screen," : ""} and turn them on there.</>
            : support.reason === "old-ios"
              ? "Notifications need iOS 16.4 or later. Update your iPhone in Settings → General → Software Update."
              : "This browser can't show notifications. Try Chrome, Edge, Firefox or Safari."}
        </p>
      ) : perm === "denied" ? (
        <p className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">
          Notifications are blocked for FitMate. Allow them in your browser&apos;s site settings (the icon next to the address), then come back here.
        </p>
      ) : !on ? (
        <>
          <ul className="mt-4 space-y-2.5 text-sm text-neutral-600 dark:text-neutral-300">
            <li className="flex gap-2.5"><Sunrise className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> Your plan for the day every morning</li>
            <li className="flex gap-2.5"><Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> A nudge on workout days, at the time you pick</li>
            <li className="flex gap-2.5"><Utensils className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /> A reminder when a meal isn&apos;t logged yet</li>
            <li className="flex gap-2.5"><Flame className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" /> A heads-up before your streak ends at midnight</li>
            <li className="flex gap-2.5"><Timer className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" /> Rest timer alerts when you switch apps</li>
          </ul>
          <button type="button" disabled={busy} onClick={turnOn} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            <Bell className="h-5 w-5" /> {busy ? "Turning on…" : "Turn on notifications"}
          </button>
        </>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
            <li className="py-3">
              <Row Icon={Sunrise} tint="text-amber-500" title="Morning plan" sub="8 am: your first meal and today's workout, so the day starts on track" checked={prefs.notify_morning} onChange={(v) => update({ notify_morning: v })} />
            </li>
            <li className="py-3">
              <Row Icon={Dumbbell} tint="text-emerald-600" title="Workout reminder" sub="On days your plan has a workout" checked={prefs.notify_workout} onChange={(v) => update({ notify_workout: v })} />
              {prefs.notify_workout && (
                <button type="button" onClick={() => setDialOpen(true)} className="mt-3 ml-8 flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-500/5 dark:border-neutral-700">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <span>
                    <span className="block text-lg font-bold tabular-nums">{label(minutes)}</span>
                    <span className="block text-[11px] text-neutral-500">Tap to change</span>
                  </span>
                  <ChevronRight className="ml-2 h-4 w-4 text-neutral-400" />
                </button>
              )}
            </li>
            <li className="py-3">
              <Row Icon={Utensils} tint="text-rose-500" title="Meal reminders" sub="A nudge when a meal from your plan isn't logged by its time" checked={prefs.notify_meals} onChange={(v) => update({ notify_meals: v })} />
            </li>
            <li className="py-3">
              <Row Icon={Flame} tint="text-orange-500" title="Streak reminders" sub="8 pm and a last call at 10:30 pm, only if today isn't done yet" checked={prefs.notify_streak} onChange={(v) => update({ notify_streak: v })} />
            </li>
            <li className="py-3">
              <Row Icon={Timer} tint="text-sky-500" title="Rest timer alerts" sub="When rest ends and FitMate isn't on screen" checked={restOn} onChange={setRest} />
            </li>
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={test} className="flex h-10 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900">
              <Send className="h-4 w-4" /> Send a test
            </button>
            <button type="button" disabled={busy} onClick={turnOff} className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-600 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300">
              <BellOff className="h-4 w-4" /> Turn off here
            </button>
          </div>
        </>
      )}
      {expanded && note && <p className={`mt-3 text-sm ${note.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}`}>{note.text}</p>}
    </section>
  );
}

function Row({ Icon, tint, title, sub, checked, onChange }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tint}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-neutral-500">{sub}</span>
      </span>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
