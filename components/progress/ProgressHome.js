"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChartColumn, Flame, Trophy, Dumbbell, Target } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { getPreferences } from "@/lib/services/preferencesService";
import { dayStats, loadDaily } from "@/lib/services/insights";
import { loadStreak } from "@/lib/services/streak";
import PageHeader from "@/components/common/PageHeader";
import { Bodyweight } from "@/components/tracker/DailyTracker";

const card = "min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900";

async function load() {
  const prefs = await getPreferences();
  const [streak, daily] = await Promise.all([loadStreak(), loadDaily()]);

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(await dayStats(prefs, d));
  }
  const scored = days.filter((d) => d.pct != null);
  const avg = scored.length ? Math.round(scored.reduce((n, d) => n + Math.min(100, d.pct), 0) / scored.length) : null;

  const sessions = await db.workoutSessions.filter((s) => Boolean(s.finishedAt) && !s.discardedAt).toArray();
  const monthAgo = Date.now() - 30 * 86_400_000;
  const workouts30 = sessions.filter((s) => s.startedAt >= monthAgo).length;

  // Workouts per week, last 8 weeks (Monday starts).
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(monday);
    start.setDate(start.getDate() - (7 - i) * 7 + 7);
    const end = start.getTime() + 7 * 86_400_000;
    return { start, count: sessions.filter((s) => s.startedAt >= start.getTime() && s.startedAt < end).length };
  });

  // Best set per exercise across all workouts.
  const sets = await db.sessionSets.toArray();
  const bests = new Map();
  for (const s of sets) {
    const value = s.holdSec ?? s.reps ?? 0;
    const prev = bests.get(s.exerciseName);
    if (!prev || value > prev.value || (value === prev.value && (s.weight ?? 0) > (prev.weight ?? 0))) bests.set(s.exerciseName, { name: s.exerciseName, value, hold: s.holdSec != null, weight: s.weight, at: s.loggedAt ?? s.createdAt });
  }

  const weights = await db.bodyMetrics.orderBy("date").toArray();
  return { streak, daily, days, avg, workouts30, weeks, bests: [...bests.values()].sort((a, b) => a.name.localeCompare(b.name)), weights: weights.slice(-30) };
}

// Progress tab: are you following the plan, and is it working?
export default function ProgressHome() {
  const data = useLiveQuery(load, []);
  if (!data) return <PageHeader title="Progress" icon={ChartColumn} />;
  const { streak, daily, days, avg, workouts30, weeks, bests, weights } = data;

  return (
    <>
      <PageHeader title="Progress" subtitle="Last 30 days" icon={ChartColumn} />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile Icon={Flame} value={streak.current} label="Day streak" />
          <Tile Icon={Trophy} value={streak.best} label="Best streak" />
          <Tile Icon={Dumbbell} value={workouts30} label="Workouts" />
          <Tile Icon={Target} value={avg == null ? "–" : `${avg}%`} label="Plan followed" />
        </div>

        <section className={card}>
          <h2 className="font-semibold">Plan followed per day</h2>
          <p className="text-xs text-neutral-500">Sets done and meals eaten vs planned. Gaps are days with nothing planned.</p>
          <div className="mt-5 flex h-32 items-end gap-[2px]" role="img" aria-label="Daily plan follow-through, last 30 days">
            {days.map((d) => (
              <div key={d.key} className="group relative flex h-full flex-1 items-end" title={`${d.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}: ${d.pct == null ? "nothing planned" : `${Math.min(100, d.pct)}%`}`}>
                <div className={`w-full rounded-t-[4px] ${d.pct == null ? "bg-neutral-200 dark:bg-neutral-800" : "bg-emerald-500 group-hover:bg-emerald-400"}`} style={{ height: d.pct == null ? 3 : `${Math.max(4, Math.min(100, d.pct))}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
            <span>{days[0].date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
            <span>Today</span>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className={card}>
            <h2 className="font-semibold">Workouts per week</h2>
            <p className="text-xs text-neutral-500">Last 8 weeks</p>
            <div className="mt-5 flex h-32 items-end gap-2">
              {weeks.map((w, i) => {
                const max = Math.max(1, ...weeks.map((x) => x.count));
                return (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Week of ${w.start.toLocaleDateString(undefined, { day: "numeric", month: "short" })}: ${w.count} workout${w.count === 1 ? "" : "s"}`}>
                    <span className="text-[11px] font-semibold text-neutral-500 tabular-nums">{w.count || ""}</span>
                    <div className={`w-full rounded-t-[4px] ${w.count ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-800"}`} style={{ height: w.count ? `${(w.count / max) * 80}%` : 3 }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
              <span>8 weeks ago</span>
              <span>This week</span>
            </div>
          </section>

          <div className="space-y-4">
            <Bodyweight dateKey={daily.today.key} current={daily.weightToday} previous={daily.previousWeight} />
            {weights.length >= 2 && <WeightLine weights={weights} />}
          </div>
        </div>

        <section className={card}>
          <h2 className="font-semibold">Personal bests</h2>
          <p className="text-xs text-neutral-500">Your best set on each exercise</p>
          {bests.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">Log a workout to see your bests here.</p>
          ) : (
            <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {bests.map((b) => (
                <li key={b.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 font-medium break-words">{b.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {b.hold ? `${b.value}s` : `${b.value} reps`}
                    {b.weight ? <span className="font-normal text-neutral-500"> × {b.weight} kg</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Tile({ Icon, value, label }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function WeightLine({ weights }) {
  const vals = weights.map((w) => w.weightKg);
  const min = Math.min(...vals) - 0.5;
  const max = Math.max(...vals) + 0.5;
  const x = (i) => (i / (weights.length - 1)) * 100;
  const y = (v) => 40 - ((v - min) / (max - min)) * 36 - 2;
  const change = Math.round((vals.at(-1) - vals[0]) * 10) / 10;
  return (
    <section className={card}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Weight trend</h2>
        <span className="text-sm text-neutral-500 tabular-nums">
          {change > 0 ? "+" : ""}
          {change} kg
        </span>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-4 h-24 w-full overflow-visible" role="img" aria-label="Bodyweight over time">
        <polyline points={weights.map((w, i) => `${x(i)},${y(w.weightKg)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className="text-emerald-500" />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
        <span>
          {weights[0].date} · {vals[0]} kg
        </span>
        <span>
          {weights.at(-1).date} · {vals.at(-1)} kg
        </span>
      </div>
    </section>
  );
}
