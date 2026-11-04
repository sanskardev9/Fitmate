"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/dexie";
import { getPreferences } from "@/lib/services/preferencesService";
import { getDaysForPlan, getDayForWeekday, getExercisesForDay } from "@/lib/services/workoutService";
import { getActiveSession, recentSessions, startSession, swapExercise } from "@/lib/services/sessionService";
import { useRouter } from "next/navigation";
import SwapSheet from "./SwapSheet";
import FinishedActions from "./FinishedActions";
import { formatTarget, WEEKDAYS } from "@/lib/utils";
import PageHeader from "@/components/common/PageHeader";
import EndWorkoutButton from "./EndWorkoutButton";
import { useState } from "react";
import { ChevronDown, Dumbbell, ArrowLeftRight, Check, Timer, Flame } from "lucide-react";
import { loadDaily } from "@/lib/services/insights";
import { useServerReady, LoadingPlans } from "@/components/sync/SyncProvider";
import { FormVideoButton, FormVideo } from "./FormVideo";
import MusicButton from "@/components/music/MusicButton";
import { inferSections } from "@/lib/workout/sections";
import { progressedPlan, blockWeek, BLOCK_WEEKS } from "@/lib/workout/progression";
import { WorkoutOutcome } from "@/components/tracker/DailyTracker";

async function load() {
  const prefs = await getPreferences();
  const active = await getActiveSession();
  const plan = prefs.activeWorkoutPlanId ? await db.workoutPlans.get(prefs.activeWorkoutPlanId) : null;
  const today = plan ? await getDayForWeekday(plan.id, new Date().getDay()) : null;
  const todayExercises = today ? await getExercisesForDay(today.id) : [];
  const days = plan ? await getDaysForPlan(plan.id) : [];
  const history = await recentSessions(30);
  // Same source of truth as Home: the main workout of today and its sets.
  const daily = await loadDaily();
  const ended = daily.active ? null : (daily.finished ?? null);
  const endedSets = daily.today.doneSets;
  // Today's targets with progressive overload applied (what the workout will ask for), and the block week.
  const progressed = today ? await progressedPlan(plan.id, inferSections(todayExercises).map((e) => ({ ...e, section: e.section ?? "main" }))) : [];
  const targets = new Map(progressed.map((p) => [p.id, p]));
  const block = plan ? await blockWeek(plan.id) : null;
  return { active, plan, today, todayExercises, days, history, ended, endedSets, daily, targets, block };
}

// Workout tab: resume / start today's session, pick another day, see recent sessions.
const SECTION_STYLE = [
  { id: "warmup", label: "Warm-up", unit: "move", bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", line: "border-amber-500/30" },
  { id: "main", label: "Main set", unit: "exercise", bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", line: "border-emerald-500/30" },
  { id: "cooldown", label: "Cool-down", unit: "move", bar: "bg-sky-500", text: "text-sky-700 dark:text-sky-400", line: "border-sky-500/30" },
];

export default function WorkoutHome() {
  const [formOpen, setFormOpen] = useState(null); // exercise whose form video is open
  const [foldOpen, setFoldOpen] = useState({}); // warm-up / cool-down expanded?
  const [swapFor, setSwapFor] = useState(null); // exercise whose alternatives are open
  const router = useRouter();
  const data = useLiveQuery(load, []);
  if (!data) return <PageHeader title="Workout" />;
  const { active, plan, today, todayExercises, days, history, ended, endedSets, daily, targets, block } = data;
  const endedPlanned = daily.today.plannedSets;

  async function swapAndStart(alt) {
    const ex = swapFor;
    setSwapFor(null);
    const session = active && active.dayId === today.id ? active : await startSession(today);
    await swapExercise(session.id, ex.id, alt);
    router.push("/session");
  }

  return (
    <>
      {swapFor && <SwapSheet exercise={swapFor} onClose={() => setSwapFor(null)} onPick={swapAndStart} startsWorkout={!(active && active.dayId === today?.id)} />}
      <PageHeader title="Workout" subtitle={plan?.name} icon={Dumbbell} action={<MusicButton />} />
      {block && (
        <div className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-3 text-sm ${block.deload ? "bg-sky-500/10 text-sky-900 dark:text-sky-200" : "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"}`}>
          <span className="font-semibold">
            Block {block.block} · Week {block.week} of {BLOCK_WEEKS}
          </span>
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: BLOCK_WEEKS }, (_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${i < block.week ? (block.deload && i === block.week - 1 ? "bg-sky-500" : "bg-emerald-500") : "bg-current opacity-15"}`} />
            ))}
          </span>
          <span className="text-xs opacity-80">{block.deload ? "Lighter week: fewer sets so you recover. Full effort again next week." : "Targets go up when you hit them. Week 4 is a lighter week."}</span>
        </div>
      )}

      {active && (
        <Link href="/session" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-600 p-5 text-white shadow-lg shadow-emerald-600/20">
          <span>
            <span className="block text-sm text-emerald-100">Workout in progress</span>
            <span className="block text-lg font-semibold">{active.dayName}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="rounded-xl bg-white px-4 py-2.5 font-semibold text-emerald-700">Resume</span>
            <EndWorkoutButton sessionId={active.id} className="bg-white/15 px-4 py-2.5 text-white" />
          </span>
        </Link>
      )}

      {!plan ? (
        <Empty />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Today · {WEEKDAYS[new Date().getDay()]}</p>
            {today ? (
              <>
                <h2 className="mt-1 text-xl font-semibold">{today.name}</h2>
                <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {/* Three sections, one look: colour bar, name, count, arrow. Main set starts open. */}
                  {SECTION_STYLE.map(({ id: sec, label, unit, bar, text, line }) => {
                    const items = inferSections(todayExercises).filter((e) => (e.section ?? "main") === sec);
                    if (!items.length) return null;
                    const open = foldOpen[sec] ?? sec === "main";
                    return (
                      <li key={sec} className="py-1.5">
                        <button type="button" onClick={() => setFoldOpen((o) => ({ ...o, [sec]: !open }))} aria-expanded={open} className="flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-sm">
                          <span className={`h-4 w-1 shrink-0 rounded-full ${bar}`} />
                          <span className={`font-semibold ${text}`}>{label}</span>
                          <span className="text-neutral-500">
                            · {items.length} {items.length === 1 ? unit : `${unit}s`}
                          </span>
                          <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
                        </button>
                        {open && (
                          <ul className={`animate-fade-up mt-1 ml-0.5 divide-y divide-neutral-100 border-l-2 pl-3 [animation-duration:200ms] dark:divide-neutral-800 ${line}`}>
                            {items.map((e) => (
                              <li key={e.id} className="py-2.5 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="min-w-0 font-medium break-words">{e.name}</span>
                                  <span className="flex shrink-0 items-center gap-2">
                                    {(() => {
                                      const t = targets?.get(e.id);
                                      const up = t?.progress && (t.progress.change === "up" || t.progress.change === "level");
                                      return (
                                        <span title={t?.progress?.note ?? undefined} className={`tabular-nums ${up ? "font-semibold text-emerald-600 dark:text-emerald-400" : t?.progress?.change === "deload" ? "text-sky-600 dark:text-sky-400" : "text-neutral-500"}`}>
                                          {up ? "↑ " : ""}
                                          {formatTarget(t ?? e)}
                                          {t?.weight && !e.weight ? ` · ${t.weight} ${t.weightUnit ?? "kg"}` : ""}
                                        </span>
                                      );
                                    })()}
                                    {e.alternatives?.length > 0 && (
                                      <button type="button" onClick={() => setSwapFor(e)} aria-label={`Swap ${e.name}`} title="Swap" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
                                        <ArrowLeftRight className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Swap</span>
                                      </button>
                                    )}
                                    <FormVideoButton open={formOpen === e.id} onToggle={() => setFormOpen((v) => (v === e.id ? null : e.id))} />
                                  </span>
                                </div>
                                {formOpen === e.id && <FormVideo name={e.name} />}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {!active && ended && endedSets >= endedPlanned ? (
                  // All done: make it feel like it.
                  <div className="animate-fade-up relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-600/25">
                    <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
                    <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10" />
                    <div className="relative flex items-center gap-4">
                      <span className="animate-pop flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-md">
                        <Check className="h-8 w-8" strokeWidth={3} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xl font-extrabold">Workout done!</p>
                        <p className="text-sm text-white/85">That&apos;s today&apos;s training in the bag. Rest well.</p>
                      </div>
                    </div>
                    <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
                      {[
                        [Check, `${endedSets}/${endedPlanned}`, "sets"],
                        [Timer, `${Math.max(1, Math.round(((ended.finishedAt ?? ended.closedAt ?? Date.now()) - ended.startedAt) / 60000))} min`, "time"],
                        [Flame, ended.effort ? `${ended.effort}/10` : "–", "effort"],
                      ].map(([Icon, v, l]) => (
                        <div key={l} className="rounded-xl bg-white/15 px-2 py-2.5 backdrop-blur">
                          <Icon className="mx-auto h-4 w-4 text-white/80" />
                          <p className="mt-1 text-base font-bold tabular-nums">{v}</p>
                          <p className="text-[11px] text-white/75 uppercase">{l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !active && ended ? (
                  <div className="mt-5 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-950">
                    <p className="text-sm font-medium">
                      {endedSets >= endedPlanned ? "Done today" : ended.closedAt ? "Not completed today" : "Ended early today"} · {endedSets}/{endedPlanned} sets
                    </p>
                    {endedSets < endedPlanned && <FinishedActions session={ended} setsDone={endedSets} single={Boolean(ended.closedAt)} />}
                  </div>
                ) : (
                  !active && (
                    <Link href={`/session?day=${today.id}`} className="mt-5 flex w-full items-center justify-center rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white active:bg-emerald-700">
                      Start workout
                    </Link>
                  )
                )}
              </>
            ) : (
              <>
                <h2 className="mt-1 text-xl font-semibold">Rest day</h2>
                <p className="mt-1 text-sm text-neutral-500">Nothing planned today. Want to train anyway? Pick a day.</p>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-medium text-neutral-500">Train a different day</h2>
            <ul className="mt-3 space-y-2">
              {days
                .filter((d) => d.id !== today?.id)
                .map((d) => (
                  <li key={d.id}>
                    <Link
                      href={active ? "/session" : `/session?day=${d.id}`}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-sm transition-colors hover:border-emerald-500 dark:border-neutral-800"
                    >
                      <span className="min-w-0 truncate font-medium">{d.name}</span>
                      <span className="shrink-0 text-xs text-neutral-500">{d.weekdays?.map((w) => WEEKDAYS[w]).join(", ")}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      )}

      {daily.today.sessions.length > 0 && (
        <div className="mt-4">
          <WorkoutOutcome data={daily} />
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Past workouts</h2>
        {!history.some((s) => s.setsDone > 0) ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">Your finished workouts will show up here.</p>
        ) : (
          <ul className="space-y-2">
            {history.filter((s) => s.setsDone > 0).map((s) => (
              <HistoryItem key={s.id} session={s} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Empty() {
  const ready = useServerReady();
  if (!ready) return <LoadingPlans />;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-lg font-semibold">No workout plan yet</h2>
      <p className="mt-1 text-sm text-neutral-500">Bring in the plan you already have and start logging.</p>
      <Link href="/plans/import" className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white">
        Import your plan
      </Link>
    </div>
  );
}

function HistoryItem({ session: s }) {
  const [open, setOpen] = useState(false);
  const sets = useLiveQuery(() => (open ? db.sessionSets.where("sessionId").equals(s.id).toArray() : []), [open, s.id]);
  const planned = Math.max(s.setsPlanned, s.setsDone);
  const pct = planned ? Math.round((s.setsDone / planned) * 100) : 0;
  const mins = Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000));
  const byExercise = (s.plan ?? []).map((e) => ({ ...e, done: (sets ?? []).filter((x) => x.exerciseId === e.exerciseId).sort((a, b) => a.setNumber - b.setNumber) }));

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 px-4 py-3 text-left">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${pct >= 90 ? "bg-emerald-500/15 text-emerald-600" : pct >= 60 ? "bg-amber-500/15 text-amber-600" : "bg-rose-500/15 text-rose-600"}`}>{pct}%</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium break-words">{s.dayName}</span>
          <span className="text-xs text-neutral-500">
            {new Date(s.startedAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · {mins} min · {s.setsDone}/{planned} sets
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="animate-fade-up space-y-2 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
          {byExercise.map((e) => (
            <li key={e.exerciseId}>
              <p className="text-sm font-medium break-words">{e.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {e.done.length === 0 && <span className="text-xs text-neutral-500">Skipped</span>}
                {e.done.map((x) => (
                  <span key={x.id} className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">
                    {x.holdSec ? `${x.holdSec}s` : x.reps}
                    {x.weight ? ` × ${x.weight}` : ""}
                  </span>
                ))}
              </div>
            </li>
          ))}
          {s.notes && <li className="text-xs text-neutral-500 italic">“{s.notes}”</li>}
        </ul>
      )}
    </li>
  );
}
