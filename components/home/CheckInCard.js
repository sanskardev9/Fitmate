"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Scale, TrendingDown, TrendingUp, Check } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { getPreferences, setPreference } from "@/lib/services/preferencesService";
import { cachedProfile } from "@/lib/services/profileService";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { calorieAdvice } from "@/lib/diet/adapt";
import { uid, now, todayKey } from "@/lib/utils";

const DAY = 86400000;

// Weekly check-in: log your weight; when the trend is off for your goal, FitMate suggests a small
// calorie change (protein stays). Shows only when there's something to do.
export default function CheckInCard() {
  const { user } = useAuth();
  const data = useLiveQuery(async () => {
    const [weights, prefs] = await Promise.all([db.bodyMetrics.orderBy("date").toArray(), getPreferences()]);
    return { weights, prefs };
  }, []);
  const [kg, setKg] = useState("");
  const [saved, setSaved] = useState(false);
  if (!data) return null;
  const { weights, prefs } = data;
  const profile = user ? cachedProfile(user.id) : null;
  const goal = profile?.goal ?? null;
  // The weight you gave at sign-up counts as your first weigh-in (so it never asks "first weigh-in").
  const since = profile?.updated_at ?? profile?.onboarded_at ?? profile?.created_at;
  const startWeight = profile?.weight_kg && since ? { date: todayKey(new Date(since)), weightKg: Number(profile.weight_kg) } : null;
  const all = startWeight && !weights.some((w) => w.date <= startWeight.date) ? [startWeight, ...weights] : weights;
  const advice = calorieAdvice({
    goal,
    weights: all,
    calories: Number(prefs.caloriesTarget) || 0,
    proteinG: prefs.proteinTargetG,
    lastAdjustAt: prefs.lastCalorieAdjustAt,
    snoozedAt: prefs.calorieAdviceSnoozedAt,
  });

  const today = todayKey(new Date());
  const last = all.at(-1);
  const daysSince = last ? Math.floor((Date.now() - new Date(`${last.date}T12:00:00`).getTime()) / DAY) : Infinity;
  const sunday = new Date().getDay() === 0;
  // Only in the morning (that's when a weigh-in means something): Sundays, or once it's been 8 days.
  const morning = new Date().getHours() < 12;
  const needWeigh = morning && last?.date !== today && ((sunday && daysSince >= 3) || daysSince >= 8);

  async function saveWeight(e) {
    e.preventDefault();
    const v = Number(kg);
    if (!(v > 25 && v < 300)) return;
    const current = await db.bodyMetrics.where("date").equals(today).first();
    if (current) await db.bodyMetrics.update(current.id, { weightKg: v });
    else await db.bodyMetrics.add({ id: uid(), date: today, weightKg: v, createdAt: now() });
    setSaved(true);
  }

  async function apply() {
    await Promise.all([
      setPreference("caloriesTarget", advice.newCalories),
      setPreference("carbsTargetG", advice.carbsG),
      setPreference("fatTargetG", advice.fatG),
      setPreference("lastCalorieAdjustAt", Date.now()),
      setPreference("calorieHistory", [...(prefs.calorieHistory ?? []), { at: Date.now(), from: Number(prefs.caloriesTarget) || null, to: advice.newCalories, rate: advice.rate }].slice(-20)),
    ]);
    // So new AI plans and reminders use it too.
    if (user && supabase) await supabase.from("profiles").update({ calories_target: advice.newCalories }).eq("id", user.id);
  }

  if (advice) {
    const Icon = advice.change < 0 ? TrendingDown : TrendingUp;
    return (
      <section className="animate-fade-up rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-bold">Adjust your calories?</p>
            <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{advice.reason}</p>
            <p className="mt-2 text-sm">
              <b className="tabular-nums">
                {Number(prefs.caloriesTarget)} → {advice.newCalories} kcal
              </b>{" "}
              <span className="text-neutral-500">
                ({advice.change > 0 ? "+" : ""}
                {advice.change} a day) · carbs {advice.carbsG} g · fat {advice.fatG} g · protein stays {prefs.proteinTargetG ?? "–"} g
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={apply} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Apply
              </button>
              <button type="button" onClick={() => setPreference("calorieAdviceSnoozedAt", Date.now())} className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                Not now
              </button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">Today&apos;s meals will show easy cuts or top-ups to match.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!needWeigh && !saved) return null;
  return (
    <section className="animate-fade-up rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      {saved ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" /> Weight saved. FitMate checks your trend every couple of weeks and adjusts your calories if needed.
        </p>
      ) : (
        <form onSubmit={saveWeight} className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
            <Scale className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Weekly weigh-in</p>
            <p className="text-sm text-neutral-500">{last ? `Last: ${last.weightKg} kg, ${daysSince === 0 ? "today" : daysSince === 1 ? "yesterday" : `${daysSince} days ago`}.` : "Before breakfast, after the bathroom."} FitMate uses it to keep your calories right.</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" inputMode="decimal" step="0.1" min="25" max="300" value={kg} onChange={(e) => setKg(e.target.value)} placeholder={last ? String(last.weightKg) : "kg"} aria-label="Weight in kg" className="h-11 w-24 rounded-xl border border-neutral-300 bg-transparent px-3 text-base tabular-nums outline-none focus:border-emerald-500 dark:border-neutral-700" />
            <button type="submit" className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
              Save
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
