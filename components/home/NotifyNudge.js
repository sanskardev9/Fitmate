"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { pushSupport, permission, currentSubscription, enablePush } from "@/lib/push";

// A gentle "turn on reminders" card on Home for people who haven't yet. It says why (their own
// streak), and "Not now" hides it for longer each time: 2 days, then 5, then 14, then 30.
const KEY = "fitmate:notifyNudge";
const SNOOZE_DAYS = [2, 5, 14, 30];

function readState() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") ?? { until: 0, times: 0 };
  } catch {
    return { until: 0, times: 0 };
  }
}

export default function NotifyNudge({ streak = 0 }) {
  const [show, setShow] = useState(false);
  const [install, setInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const s = pushSupport();
    if (Date.now() < readState().until) return;
    // Never nag when they blocked it or the browser can't do it.
    if (s.needsInstall) return void (setInstall(true), setShow(true));
    if (!s.ok || permission() === "denied") return;
    currentSubscription().then((sub) => setShow(!(sub && permission() === "granted")));
  }, []);

  if (!show) return null;

  function snooze() {
    const st = readState();
    const days = SNOOZE_DAYS[Math.min(st.times, SNOOZE_DAYS.length - 1)];
    try {
      localStorage.setItem(KEY, JSON.stringify({ until: Date.now() + days * 86400000, times: st.times + 1 }));
    } catch {}
    setShow(false);
  }
  async function turnOn() {
    setBusy(true);
    setError("");
    try {
      await enablePush();
      setDone(true);
      setTimeout(() => setShow(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const why = streak > 0 ? `Don't lose your ${streak}-day streak.` : "Build a streak you won't forget.";
  return (
    <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-white to-white p-5 dark:via-neutral-900 dark:to-neutral-900">
      <button type="button" onClick={snooze} aria-label="Not now" className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800">
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-4 pr-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
          <BellRing className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">{done ? "You're all set 🎉" : why}</h2>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            {done
              ? "We'll remind you on workout days and before your streak ends."
              : install
                ? "Add FitMate to your Home Screen to get a reminder on workout days and a heads-up before your streak ends at midnight."
                : "Get a reminder on workout days and a heads-up before your streak ends at midnight. Nothing else, no spam."}
          </p>
        </div>
      </div>
      {!done && (
        <div className="mt-4 flex flex-wrap gap-2">
          {install ? (
            <Link href="/profile" className="flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
              Show me how
            </Link>
          ) : (
            <button type="button" disabled={busy} onClick={turnOn} className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              <BellRing className="h-4 w-4" /> {busy ? "Turning on…" : "Turn on reminders"}
            </button>
          )}
          <button type="button" onClick={snooze} className="h-10 rounded-xl px-4 text-sm font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Not now
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </section>
  );
}
