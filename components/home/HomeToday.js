"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Utensils, Play, Square, ChevronRight, Upload, Trophy, CalendarDays, Check, X, Snowflake } from "lucide-react";
import { loadDaily } from "@/lib/services/insights";
import { getPreferences, setPreference } from "@/lib/services/preferencesService";
import { loadStreak } from "@/lib/services/streak";
import { finishSession, closeSession } from "@/lib/services/sessionService";
import { skipRest } from "@/lib/workout/restTimer";
import { useAuth, displayName } from "@/components/auth/AuthProvider";
import { useConfirm } from "@/components/common/ConfirmDialog";
import FinishedActions from "@/components/workout/FinishedActions";
import { Nutrition } from "@/components/tracker/DailyTracker";
import { useServerReady, LoadingPlans } from "@/components/sync/SyncProvider";
import NotifyNudge from "./NotifyNudge";
import InstallNudge from "./InstallNudge";
import StreakCelebration from "./StreakCelebration";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

async function load() {
  const [daily, streak, prefs] = await Promise.all([loadDaily(), loadStreak(), getPreferences()]);
  return { daily, streak, prefs };
}

// Home for signed-in users: streak, what you did today, what's next, and this week.
export default function HomeToday() {
  const data = useLiveQuery(load, []);
  const { user } = useAuth();
  const confirm = useConfirm();
  const [celebrate, setCelebrate] = useState(false);

  const todayDone = data?.streak.today.status === "done";
  const todayKey = data?.streak.today.key;
  useEffect(() => {
    if (!todayDone || !todayKey) return;
    if (data.prefs.lastCelebrated === todayKey) return;
    setPreference("lastCelebrated", todayKey);
    setCelebrate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayDone, todayKey]);

  if (!data) return <Skeleton />;
  const { daily, streak } = data;
  const name = displayName(user).split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  async function endWorkout() {
    const ok = await confirm({ title: "End this workout?", message: "Sets you logged are saved. Sets you didn't log count as skipped.", confirmLabel: "End workout", tone: "warn" });
    if (!ok) return;
    await finishSession(daily.active.id, {});
    skipRest();
  }

  return (
    <div className="space-y-4">
      <header className="animate-fade-up flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting}
            {name ? `, ${name}` : ""}
          </h1>
        </div>
        <Link href="/streak" aria-label="Open streak">
          <StreakPill count={streak.current} lit={streak.current > 0 || todayDone} />
        </Link>
      </header>

      <NextUp daily={daily} onEnd={endWorkout} />
      {daily.prefs.activeDietPlanId ? <Nutrition data={daily} /> : <AddDiet />}
      <StreakCard streak={streak} goal={Number(data.prefs.streakGoal) || null} />
      <InstallNudge />
      <NotifyNudge streak={streak.current} />

      {celebrate && <StreakCelebration count={streak.current} best={streak.best} week={streak.week} freezes={streak.freezes} onClose={() => setCelebrate(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------- streak

export function Flame({ lit, className = "h-10 w-10", animate = true }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${lit && animate ? "animate-flicker origin-bottom" : ""}`} aria-hidden="true">
      <defs>
        <linearGradient id="flame-outer" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={lit ? "#f97316" : "#a3a3a3"} />
          <stop offset="1" stopColor={lit ? "#facc15" : "#d4d4d4"} />
        </linearGradient>
      </defs>
      <path d="M12 2c.6 3.2 3.4 4.7 4.9 7.4 1.2 2.1 1.6 4.6.6 6.9A6.4 6.4 0 0112 22a6.4 6.4 0 01-5.5-5.7c-.3-2.4.6-4.3 2-5.9.3 1.4 1 2.4 2 2.9C10.2 9.8 10.6 5.6 12 2z" fill="url(#flame-outer)" />
      <path d="M12 12.5c.3 1.6 1.8 2.3 2.2 3.8.4 1.6-.6 3.4-2.2 3.7-1.7.3-3-1-3-2.6 0-1.3.8-2.2 1.6-2.9.1.7.4 1.2.9 1.5-.2-1.5.1-2.6.5-3.5z" fill={lit ? "#fef3c7" : "#f5f5f5"} opacity="0.9" />
    </svg>
  );
}

// The big flame on the streak card: layered, flickering, with embers rising when it's lit.
export function LiveFlame({ lit, className = "h-24 w-24" }) {
  const embers = [
    [38, 0, -14],
    [55, 0.7, 10],
    [47, 1.4, -6],
    [60, 2.1, 16],
    [42, 2.8, 4],
  ];
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      {lit && <div className="absolute inset-[12%] rounded-full bg-orange-500/35 blur-2xl motion-safe:animate-pulse" />}
      <svg viewBox="0 0 24 24" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id="lf-outer" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={lit ? "#ea580c" : "#a3a3a3"} />
            <stop offset="0.6" stopColor={lit ? "#f97316" : "#bdbdbd"} />
            <stop offset="1" stopColor={lit ? "#fbbf24" : "#d4d4d4"} />
          </linearGradient>
          <linearGradient id="lf-mid" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={lit ? "#f97316" : "#c4c4c4"} />
            <stop offset="1" stopColor={lit ? "#fde047" : "#e5e5e5"} />
          </linearGradient>
        </defs>
        <g className={lit ? "animate-flicker origin-bottom" : ""} style={{ animationDuration: "1.9s" }}>
          <path d="M12 1.5c.7 3.4 3.6 4.9 5.1 7.7 1.3 2.2 1.7 4.8.6 7.2A6.6 6.6 0 0112 22.5a6.6 6.6 0 01-5.7-5.9c-.3-2.5.6-4.5 2.1-6.1.3 1.5 1 2.5 2.1 3C10.1 9.6 10.6 5.3 12 1.5z" fill="url(#lf-outer)" />
        </g>
        <g className={lit ? "animate-flicker origin-bottom" : ""} style={{ animationDuration: "1.3s", animationDelay: "-0.4s" }}>
          <path d="M12 8.5c.5 2.3 2.4 3.4 3.1 5.4.7 2.1-.1 4.5-2.3 5.4-2.4.9-5-.6-5.2-3.1-.1-1.7.8-2.9 1.8-3.8.2 1 .7 1.7 1.4 2-.3-2.1.3-4.1 1.2-5.9z" fill="url(#lf-mid)" />
        </g>
        <g className={lit ? "animate-flicker origin-bottom" : ""} style={{ animationDuration: "0.9s", animationDelay: "-0.2s" }}>
          <path d="M12 14c.3 1.3 1.4 1.9 1.7 3.1.3 1.3-.5 2.6-1.8 2.8-1.4.2-2.4-.8-2.4-2 0-1 .6-1.7 1.2-2.2.1.5.3.9.7 1.1-.2-1.1.1-2 .6-2.8z" fill={lit ? "#fff7ed" : "#f5f5f5"} />
        </g>
      </svg>
      {lit &&
        embers.map(([left, delay, drift], i) => (
          <span key={i} className="ember absolute bottom-[40%] h-1.5 w-1.5 rounded-full bg-amber-300" style={{ left: `${left}%`, animationDelay: `${delay}s`, "--x": `${drift}px` }} />
        ))}
    </div>
  );
}

function StreakPill({ count, lit }) {
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums ring-1 ${lit ? "bg-orange-500/10 text-orange-600 ring-orange-500/30 dark:text-orange-400" : "bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"}`}>
      <Flame lit={lit} className="h-5 w-5" />
      {count}
    </span>
  );
}

const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

const GOALS = [7, 14, 30, 50, 100];

function StreakCard({ streak, goal }) {
  const [picking, setPicking] = useState(false);
  const { current, best, week, today, freezes, recentFreeze, nextFreezeIn } = streak;
  const lit = current > 0 || today.status === "done";
  const message =
    today.status === "done"
      ? "Streak extended. See you tomorrow!"
      : today.status === "rest"
        ? "Rest day. Your streak is safe."
        : current > 0
          ? "Follow today's plan before midnight to keep it."
          : "Follow today's plan to start a streak.";
  // Your own goal when you've set one; otherwise the next milestone (3, 7, 14, 30 …).
  const reached = goal && current >= goal;
  const next = goal && !reached ? goal : (MILESTONES.find((m) => m > current) ?? current + 100);
  const prev = goal && !reached ? 0 : ([...MILESTONES].reverse().find((m) => m <= current) ?? 0);
  // Buttons inside the card's link: don't open the streak page.
  const tap = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  const choose = (n) => {
    setPreference("streakGoal", n);
    setPicking(false);
  };
  const toNext = Math.round(((current - prev) / (next - prev)) * 100);
  // Days that keep the chain going: followed, or saved by a freeze.
  const kept = (d) => d.status === "done" || d.status === "frozen";

  return (
    <Link href="/streak" className="animate-fade-up relative block overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-white to-white p-5 transition-transform active:scale-[0.99] sm:p-6 dark:from-orange-500/15 dark:via-neutral-900 dark:to-neutral-900">
      <div className={`pointer-events-none absolute -top-20 -left-12 h-56 w-56 rounded-full blur-3xl ${lit ? "bg-orange-500/25" : "bg-neutral-400/10"}`} />
      <div className="relative flex items-center gap-4 sm:gap-5">
        <LiveFlame lit={lit} className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1">
          <p className={`text-5xl leading-none font-black tracking-tight tabular-nums sm:text-6xl ${lit ? "bg-gradient-to-b from-amber-400 to-orange-600 bg-clip-text text-transparent" : "text-neutral-400"}`}>{current}</p>
          <p className="mt-1 font-bold text-orange-600 dark:text-orange-400">day streak</p>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
        </div>
        <span title="Streak freezes save your streak if you miss a day" className="absolute top-0 right-0 flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-700 tabular-nums ring-1 ring-sky-500/25 dark:text-sky-300">
          <Snowflake className="h-3.5 w-3.5" /> {freezes} {freezes === 1 ? "freeze" : "freezes"}
        </span>
      </div>
      {recentFreeze && (
        <p className="relative mt-4 flex items-center gap-2 rounded-2xl bg-sky-500/10 px-3 py-2 text-sm text-sky-800 dark:text-sky-200">
          <Snowflake className="h-4 w-4 shrink-0" /> A streak freeze saved your streak on {recentFreeze.date.toLocaleDateString(undefined, { weekday: "long" })}.
        </p>
      )}

      {/* The week as a chain: kept days are joined by an orange line. */}
      <div className="relative mt-6 grid grid-cols-7">
        {week.map((d, i) => {
          const joinLeft = i > 0 && kept(d) && kept(week[i - 1]);
          const joinRight = i < 6 && kept(d) && kept(week[i + 1]);
          return (
            <div key={d.key} className="relative flex flex-col items-center gap-1.5">
              <span className={`text-xs font-bold ${d.isToday ? "text-orange-600 dark:text-orange-400" : "text-neutral-400"}`}>{DAY_LETTERS[i]}</span>
              <div className="relative flex h-12 w-full items-center justify-center">
                {joinLeft && <span className="absolute top-1/2 left-0 h-1.5 w-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-400 to-orange-500" />}
                {joinRight && <span className="absolute top-1/2 right-0 h-1.5 w-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-orange-400" />}
                <DayBubble status={d.status} isToday={d.isToday} delay={i * 70} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Your streak goal (asked once, like Duolingo), or the next milestone. */}
      {!goal || picking || reached ? (
        <div className="relative mt-5 rounded-2xl bg-white/70 p-3 ring-1 ring-orange-500/15 dark:bg-neutral-950/50">
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{reached && !picking ? `Goal reached: ${goal} days! Pick your next goal` : "Pick your streak goal"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {GOALS.filter((n) => n > current).map((n) => (
              <button key={n} type="button" onClick={tap(() => choose(n))} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-transform active:scale-95 ${goal === n ? "bg-orange-500 text-white" : "bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 dark:text-orange-300"}`}>
                {n} days
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="relative mt-5">
        <p className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          {next - current === 1 ? "1 more day" : `${next - current} more days`} to {goal && !reached ? `your ${next}-day goal` : `a ${next}-day streak`}
          {goal && !reached && !picking && (
            <button type="button" onClick={tap(() => setPicking(true))} className="font-medium text-orange-600 hover:underline dark:text-orange-400">
              Change
            </button>
          )}
        </p>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <span className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-1000" style={{ width: `${Math.max(4, toNext)}%` }} />
        </span>
      </div>
      <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500">
        {nextFreezeIn != null && (
          <span className="flex items-center gap-1">
            <Snowflake className="h-3.5 w-3.5 text-sky-500" /> Freeze in {nextFreezeIn} {nextFreezeIn === 1 ? "day" : "days"}
          </span>
        )}
        {best > 0 && (
          <span className="flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" /> Best {best}
          </span>
        )}
        <span className="ml-auto flex items-center gap-0.5 font-semibold text-orange-600 dark:text-orange-400">
          Calendar <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

// Streak freezes you're holding (max 2), shown as ice cubes.
export function FreezeBadge({ count, className = "" }) {
  return (
    <span title={`${count} streak freeze${count === 1 ? "" : "s"}`} className={`flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-700 tabular-nums ring-1 ring-sky-500/25 dark:text-sky-300 ${className}`}>
      <Snowflake className="h-3.5 w-3.5" /> {count}
    </span>
  );
}

function DayBubble({ status, isToday, delay }) {
  const size = isToday ? "h-11 w-11 sm:h-12 sm:w-12" : "h-9 w-9 sm:h-10 sm:w-10";
  const base = `relative z-10 flex ${size} items-center justify-center rounded-full`;
  if (status === "frozen")
    return (
      <span title="Saved by a streak freeze" className={`${base} bg-gradient-to-b from-sky-300 to-sky-500 text-white shadow-md shadow-sky-500/30`}>
        <Snowflake className="h-5 w-5" />
      </span>
    );
  if (status === "done")
    return isToday ? (
      <span className={`${base} animate-pop bg-gradient-to-b from-amber-400 to-orange-600 text-white shadow-lg shadow-orange-500/40 ring-4 ring-orange-500/20`} style={{ animationDelay: `${delay}ms` }}>
        <span className="absolute inset-0 rounded-full bg-orange-400/40 motion-safe:animate-ping [animation-duration:2.4s]" />
        <Flame lit animate className="relative h-7 w-7 [&_path:first-child]:fill-white [&_path:last-child]:fill-amber-200" />
      </span>
    ) : (
      <span className={`${base} animate-pop bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/30`} style={{ animationDelay: `${delay}ms` }}>
        <Check className="h-5 w-5" strokeWidth={3.5} />
      </span>
    );
  if (status === "missed")
    return (
      <span className={`${base} bg-neutral-100 text-neutral-400 dark:bg-neutral-800`}>
        <X className="h-4 w-4" />
      </span>
    );
  if (status === "pending")
    return (
      <span className={`${base} border-2 border-dashed border-orange-400 bg-white text-orange-500 dark:bg-neutral-900`}>
        <span className="animate-pulse-ring absolute inset-0 rounded-full bg-orange-400/30" />
        <Flame lit={false} animate={false} className="h-5 w-5 opacity-60" />
      </span>
    );
  if (status === "rest") return <span title="Rest day" className={`${base} ${isToday ? "ring-2 ring-orange-400/50" : ""} bg-neutral-100 dark:bg-neutral-800`}><span className="h-1.5 w-1.5 rounded-full bg-neutral-400" /></span>;
  return <span className={`${base} border-2 border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900`} />;
}

// ---------------------------------------------------------------- next up

function NextUp({ daily, onEnd }) {
  const ready = useServerReady();
  const { today, active, finished, workoutMinutes } = daily;

  if (active) {
    const done = today.doneSets;
    return (
      <section className="animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-600/20 sm:p-6">
        <p className="text-sm text-emerald-100">Workout in progress</p>
        <h2 className="mt-1 text-xl font-semibold">{active.dayName}</h2>
        <Bar pct={today.plannedSets ? (done / today.plannedSets) * 100 : 0} className="mt-4 bg-white/20" fill="bg-white" />
        <p className="mt-2 text-sm text-emerald-100 tabular-nums">
          {done}/{today.plannedSets} sets logged
        </p>
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <Link href="/session" className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-semibold text-emerald-700">
            <Play className="h-4 w-4 fill-current" /> Resume
          </Link>
          <button type="button" onClick={onEnd} className="flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-3.5 font-semibold">
            <Square className="h-4 w-4 fill-current" /> End
          </button>
        </div>
      </section>
    );
  }

  if (finished) {
    const complete = today.plannedSets > 0 && today.doneSets >= today.plannedSets;
    if (!complete && finished.closedAt) {
      return (
        <section className="animate-fade-up flex flex-wrap items-center gap-4 rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800">
            <Square className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-neutral-500">Not completed today</span>
            <span className="block font-semibold break-words">{finished.dayName}</span>
            <span className="block text-xs text-neutral-500">
              {today.doneSets}/{today.plannedSets} sets logged
            </span>
          </span>
          <div className="-mt-4 basis-full">
            <FinishedActions session={finished} setsDone={today.doneSets} single />
          </div>
        </section>
      );
    }
    return (
      <section className={`animate-fade-up relative rounded-3xl border p-5 sm:p-6 ${complete ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
        <div className="flex items-center gap-4">
          <span className={`animate-pop flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${complete ? "bg-emerald-500" : "bg-amber-500"}`}>
            <Check className="h-6 w-6" strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1 pr-6">
            <span className={`block text-sm ${complete ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{complete ? "Workout done" : "Workout ended early"}</span>
            <span className="block font-semibold break-words">{finished.dayName}</span>
            <span className="block text-xs text-neutral-500">
              {today.doneSets}/{today.plannedSets} sets · {workoutMinutes} min
            </span>
          </span>
        </div>
        {!complete && (
          <>
            <button type="button" onClick={() => closeSession(finished.id)} aria-label="Done for today, hide these options" title="Done for today" className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-700 dark:hover:text-neutral-200">
              <X className="h-5 w-5" />
            </button>
            <FinishedActions session={finished} setsDone={today.doneSets} />
          </>
        )}
      </section>
    );
  }

  if (today.day) {
    return (
      <section className="animate-fade-up rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500">Today&apos;s workout</p>
        <h2 className="mt-1 text-xl font-semibold">{today.day.name}</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {today.exercises.slice(0, 6).map((e) => (
            <span key={e.id} className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {e.name}
            </span>
          ))}
          {today.exercises.length > 6 && <span className="px-1 py-1 text-xs text-neutral-500">+{today.exercises.length - 6} more</span>}
        </div>
        <Link href={`/session?day=${today.day.id}`} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 active:bg-emerald-700">
          <Play className="h-5 w-5 fill-current" /> Start workout · {today.plannedSets} sets
        </Link>
      </section>
    );
  }

  if (!today.day && today.meals.length === 0 && !daily.prefs.activeWorkoutPlanId && !daily.prefs.activeDietPlanId) {
    if (!ready) return <LoadingPlans />;
    return (
      <section className="animate-fade-up rounded-3xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Upload className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-semibold">Let&apos;s set up your first plan</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">Then this screen shows today&apos;s workout and meals, ready to tick off.</p>
        <div className="mx-auto mt-5 grid max-w-sm gap-2 sm:grid-cols-2">
          <Link href="/plans/import?start=create" className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white active:bg-emerald-700">
            Create a plan
          </Link>
          <Link href="/plans/import?start=have" className="rounded-xl border border-neutral-300 py-3 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
            Import a plan
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-up flex items-center gap-4 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
        <CalendarDays className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Rest day</span>
        <span className="block text-sm text-neutral-500">No workout planned. Recovery is part of the plan.</span>
      </span>
      <Link href="/workout" className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
        Train anyway
      </Link>
    </section>
  );
}

function AddDiet() {
  const ready = useServerReady();
  if (!ready) return null;
  return (
    <Link href="/plans/import?kind=diet" className="animate-fade-up flex items-center gap-4 rounded-3xl border border-dashed border-neutral-300 p-5 sm:p-6 dark:border-neutral-700">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
        <Utensils className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Add your diet plan</span>
        <span className="block text-sm text-neutral-500">Tick off meals here and track protein every day.</span>
      </span>
      <ChevronRight className="h-5 w-5 text-neutral-400" />
    </Link>
  );
}


function Bar({ pct, className = "", fill }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full ${className}`}>
      <div className={`h-full rounded-full ${fill} transition-[width] duration-700 ease-out`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------- celebration


function Skeleton() {
  return (
    <div className="space-y-4">
      {[60, 220, 180, 160].map((h, i) => (
        <div key={i} className="animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-900" style={{ height: h }} />
      ))}
    </div>
  );
}
