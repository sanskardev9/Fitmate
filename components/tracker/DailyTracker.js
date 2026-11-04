"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/dexie";
import { setPreference } from "@/lib/services/preferencesService";
import { logMeal, unlogMeal, removeExtraFood, addMealAddon, removeMealAddon } from "@/lib/services/dietService";
import { loadDaily, buildInsights } from "@/lib/services/insights";
import { uid, now, WEEKDAYS } from "@/lib/utils";
import TargetsForm from "@/components/targets/TargetsForm";
import EndWorkoutButton from "@/components/workout/EndWorkoutButton";
import FinishedActions from "@/components/workout/FinishedActions";
import RecipeVideo from "@/components/diet/RecipeVideo";
import { Repeat2, Plus, Trash2, X } from "lucide-react";
import AddFoodSheet from "@/components/diet/AddFoodSheet";
import MealSwap from "@/components/diet/MealSwap";
import { dishName, mealTiming } from "@/lib/diet/dishName";

const ICONS = {
  dumbbell: "M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3",
  up: "M4 17l6-6 4 4 6-8M15 7h5v5",
  down: "M4 7l6 6 4-4 6 8M15 17h5v-5",
  leaf: "M12 21c-4.4 0-8-3.1-8-7.5C4 8 8 4 12 3c4 1 8 5 8 10.5 0 4.4-3.6 7.5-8 7.5zM12 3v18",
  check: "M4 12.5l5 5L20 6.5",
  flame: "M12 3c3 4 6 6.5 6 10.5a6 6 0 01-12 0C6 10 9 8 12 3zM12 21a3 3 0 003-3c0-2-3-4-3-4s-3 2-3 4a3 3 0 003 3z",
  moon: "M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z",
};
const TONE = {
  good: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  warn: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  todo: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  calm: "bg-neutral-500/10 text-neutral-600 ring-neutral-500/20 dark:text-neutral-300",
};

function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

const card = "min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900";

export default function DailyTracker() {
  const data = useLiveQuery(() => loadDaily(), []);
  if (!data) return <Skeleton />;

  const insights = buildInsights(data);
  const { today } = data;

  return (
    <div className="space-y-4">
      <Hero data={data} insights={insights} />
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <WorkoutOutcome data={data} />
        <Nutrition data={data} />
      </div>
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Week week={data.week} todayKey={today.key} />
        <Bodyweight dateKey={today.key} current={data.weightToday} previous={data.previousWeight} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- hero

function Hero({ data, insights }) {
  const { today, streak } = data;
  const pct = today.pct;
  const headline =
    pct == null ? "Nothing planned today" : pct >= 100 ? "Plan followed. Perfect day." : pct >= 70 ? "On track today" : pct > 0 ? "Partway there" : "Today's plan is ready";
  const sub = [
    today.plannedSets ? `${today.doneSets}/${today.plannedSets} sets` : null,
    today.meals.length ? `${today.eatenPlanned}/${today.meals.length} meals` : null,
    streak >= 2 ? `${streak}-day streak` : null,
  ].filter(Boolean);

  return (
    <section className={`${card} animate-fade-up relative overflow-hidden`}>
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <Ring pct={pct ?? 0} label={pct == null ? "–" : `${pct}%`} caption="followed" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-neutral-500">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{headline}</h1>
          {sub.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sub.map((s) => (
                <span key={s} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {insights.length > 0 && (
        <ul className="relative mt-6 space-y-2">
          {insights.map((ins, i) => (
            <li key={i} className={`animate-fade-up flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ${TONE[ins.tone]}`} style={{ animationDelay: `${100 + i * 70}ms` }}>
              <Icon name={ins.icon} className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1 leading-relaxed text-neutral-800 dark:text-neutral-200">{ins.text}</span>
              {ins.action && (
                <Link href={ins.action.href} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                  {ins.action.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Ring({ pct, label, caption, size = "h-28 w-28" }) {
  return (
    <div className={`relative shrink-0 ${size}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-neutral-100 dark:stroke-neutral-800" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - Math.min(100, pct)}
          className={`transition-[stroke-dashoffset] duration-1000 ease-out ${pct >= 70 ? "stroke-emerald-500" : pct > 0 ? "stroke-amber-500" : "stroke-neutral-300 dark:stroke-neutral-700"}`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{label}</span>
        <span className="text-[10px] tracking-wider text-neutral-500 uppercase">{caption}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- workout

export function WorkoutOutcome({ data }) {
  const { today, exercises, finished, active, workoutMinutes } = data;
  if (!today.day && !today.sessions.length) {
    return (
      <section className={card}>
        <Heading icon="moon" title="Workout" />
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">Rest day. Nothing planned. Want to train anyway?</p>
        <Link href="/workout" className="mt-4 inline-flex text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Pick a workout →
        </Link>
      </section>
    );
  }

  const name = (finished ?? active)?.dayName ?? today.day?.name;
  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3">
        <Heading icon="dumbbell" title={name} sub={finished ? `Done · ${workoutMinutes} min${finished.effort ? ` · effort ${finished.effort}/10` : ""}` : active ? "In progress" : "Not started"} />
        {!finished && (
          <div className="flex shrink-0 items-center gap-2">
            <Link href={active ? "/session" : `/session?day=${today.day.id}`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              {active ? "Resume" : "Start"}
            </Link>
            {active && <EndWorkoutButton sessionId={active.id} className="border border-neutral-300 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200" />}
          </div>
        )}
      </div>

      {finished && !finished.closedAt && today.doneSets < today.plannedSets && <FinishedActions session={finished} setsDone={today.doneSets} />}

      <ul className="mt-5 space-y-3">
        {exercises.map((e) => {
          const unit = e.type === "hold" ? "s" : "";
          return (
            <li key={e.exerciseId ?? e.name} className="rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-950">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium">{e.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  {e.pr && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">New best</span>}
                  {e.delta != null && e.delta !== 0 && (
                    <span className={`font-semibold tabular-nums ${e.delta > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {e.delta > 0 ? "+" : ""}
                      {e.delta}
                      {unit} vs last
                    </span>
                  )}
                  <span className="text-neutral-500 tabular-nums">
                    {e.done.length}/{e.sets}
                  </span>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: Math.max(e.sets, e.done.length) }, (_, i) => {
                  const s = e.done[i];
                  const v = s ? (e.type === "hold" ? s.holdSec : s.reps) : null;
                  const hit = s && e.target ? v >= e.target : Boolean(s);
                  return (
                    <span
                      key={i}
                      title={s ? `Set ${i + 1}: ${v}${unit}${s.weight ? ` × ${s.weight} ${s.weightUnit}` : ""}` : `Set ${i + 1}: not logged`}
                      className={`flex h-8 min-w-10 items-center justify-center rounded-lg px-2 text-xs font-semibold tabular-nums ${
                        !s ? "border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-700" : hit ? "bg-emerald-500 text-white" : "bg-amber-500/90 text-white"
                      }`}
                    >
                      {s ? `${v}${unit}` : `${e.target ?? "–"}${unit}`}
                    </span>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
        <Legend className="bg-emerald-500" label="Hit target" />
        <Legend className="bg-amber-500" label="Under target" />
        <Legend className="border border-dashed border-neutral-400" label="Not logged (shows target)" />
      </p>
    </section>
  );
}

const Legend = ({ className, label }) => (
  <span className="flex items-center gap-1.5">
    <span className={`h-2.5 w-2.5 rounded-sm ${className}`} />
    {label}
  </span>
);

// ---------------------------------------------------------------- nutrition

export function Nutrition({ data, title = "Today's meals" }) {
  const { today, eaten, targets, prefs } = data;
  const [open, setOpen] = useState(null);
  const [swapFor, setSwapFor] = useState(null);
  const [addingFood, setAddingFood] = useState(false);
  const [addonFor, setAddonFor] = useState(null);
  const closeAddon = useCallback(() => setAddonFor(null), []);
  const closeAddFood = useCallback(() => setAddingFood(false), []);
  const closeSwap = useCallback(() => setSwapFor(null), []);
  const [calc, setCalc] = useState(false);
  const custom = prefs.proteinTargetG != null || prefs.caloriesTarget != null;

  const bars = [
    ["Protein", eaten.proteinG, targets.proteinG, "g", "bg-emerald-500"],
    ["Calories", eaten.calories, targets.calories, "kcal", "bg-amber-500"],
    ["Carbs", eaten.carbsG, targets.carbsG, "g", "bg-sky-500"],
    ["Fat", eaten.fatG, targets.fatG, "g", "bg-rose-500"],
  ].filter(([label, , goal]) => goal > 0 || label === "Protein");
  // Protein and calories are what matter day to day; carbs and fat stay as a small line.
  const mainBars = bars.filter(([l]) => l === "Protein" || l === "Calories");
  const minor = bars.filter(([l]) => l === "Carbs" || l === "Fat");

  return (
    <section className={card}>
      <Heading icon="leaf" title={title} sub={today.meals.length ? `${today.eatenPlanned}/${today.meals.length} meals eaten` : "No meals planned today"} />

      <div className="mt-5 space-y-3">
        {mainBars.map(([label, value, goal, unit, color]) => {
          const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
          const left = goal ? Math.max(0, Math.round(goal - value)) : null;
          return (
            <div key={label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-neutral-500 tabular-nums">
                  <b className="text-neutral-900 dark:text-neutral-100">{Math.round(value)}</b> / {goal ? Math.round(goal) : "–"} {unit}
                  {left ? <span className="ml-1.5 text-xs">· {left} left</span> : null}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className={`h-full rounded-full ${color} transition-[width] duration-700 ease-out`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {minor.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 tabular-nums">
          {minor.map(([label, value, goal, unit]) => (
            <span key={label}>
              {label} <b className="font-semibold text-neutral-700 dark:text-neutral-300">{Math.round(value)}</b>/{Math.round(goal)} {unit}
            </span>
          ))}
        </p>
      )}

      {today.meals.length > 0 && today.eatenPlanned === 0 && <p className="mt-5 -mb-2 text-xs text-neutral-500">Tap ✓ when you eat a meal. Tap a meal to see its recipe and video.</p>}
      {today.meals.length > 0 && (
        <ul className="mt-5 divide-y divide-neutral-100 dark:divide-neutral-800">
          {today.meals.map((m) => {
            const eatenLog = today.logs.find((l) => l.mealId === m.id);
            const done = Boolean(eatenLog);
            const choice = data.swaps?.[m.id] ? { ...m, ...data.swaps[m.id], id: m.id } : m;
            const swapped = choice !== m ? choice : null;
            const expanded = open === m.id;
            return (
              <li key={m.id} className="py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={done ? `Mark ${m.name} as not eaten` : `Mark ${m.name} as eaten`}
                    onClick={() => (done ? unlogMeal(m.id, today.key) : logMeal(choice, today.key))}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 active:scale-95 ${done ? "bg-emerald-500 text-white" : "border-2 border-neutral-300 text-neutral-300 hover:border-emerald-500 hover:text-emerald-500 dark:border-neutral-700 dark:text-neutral-700"}`}
                  >
                    <Icon name="check" className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => setOpen(expanded ? null : m.id)} className="min-w-0 flex-1 text-left">
                    <span className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                      {m.slot}
                      {mealTiming(m) ? <span> · {mealTiming(m)}</span> : null}
                      {(swapped ?? m).proteinG ? <span className="tracking-normal normal-case"> · {Math.round((swapped ?? m).proteinG)} g protein</span> : null}
                    </span>
                    <span className={`block text-sm font-medium break-words ${done ? "text-neutral-400 line-through" : ""}`}>{dishName(swapped ? swapped.name : m.name)}</span>
                    {eatenLog?.addons?.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {eatenLog.addons.map((a) => (
                          <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 py-0.5 pr-1 pl-2 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                            + {a.name} · {Math.round(a.proteinG)} g
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={`Remove ${a.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMealAddon(eatenLog.id, a.id);
                              }}
                              className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-sky-500/20"
                            >
                              <X className="h-3 w-3" />
                            </span>
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwapFor(m.id)}
                    aria-label={`Swap ${(swapped ?? m).name}`}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors active:scale-95 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white`}
                  >
                    <Repeat2 className="h-3.5 w-3.5" /> Swap
                  </button>
                  {(m.recipe || m.name) && (
                    <button type="button" onClick={() => setOpen(expanded ? null : m.id)} aria-label="Show recipe" className={`shrink-0 text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`}>
                      ⌄
                    </button>
                  )}
                </div>
                {expanded && (
                  <div className="animate-fade-up mt-3 space-y-2 sm:ml-14">
                    <button
                      type="button"
                      onClick={() => setAddonFor(choice)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-2.5 text-sm font-semibold text-neutral-600 hover:border-emerald-500 hover:text-emerald-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-emerald-400"
                    >
                      <Plus className="h-4 w-4" /> Add to this meal
                    </button>
                    {/* After a swap, show the recipe + video of what you actually chose. */}
                    {(swapped ? swapped.recipe : m.recipe) && <p className="rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed whitespace-pre-line text-neutral-600 dark:bg-neutral-950 dark:text-neutral-400">{swapped ? swapped.recipe : m.recipe}</p>}
                    <RecipeVideo key={swapped ? swapped.name : m.name} url={swapped ? swapped.videoUrl : m.videoUrl} dish={swapped ? swapped.name : m.name} search={(swapped ?? m).videoSearch} />
                  </div>
                )}
                {swapFor === m.id && <MealSwap meal={m} dateKey={today.key} chosen={swapped} onClose={closeSwap} />}
              </li>
            );
          })}
        </ul>
      )}

      {today.logs.some((l) => l.extra) && (
        <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
          {today.logs
            .filter((l) => l.extra)
            .map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                    Extra · {Math.round(l.proteinG)} g protein · {Math.round(l.calories)} kcal
                  </span>
                  <span className="block text-sm font-medium break-words">
                    {dishName(l.name)}
                    {l.serving ? <span className="font-normal text-neutral-500"> · {l.serving}</span> : null}
                  </span>
                </span>
                <button type="button" onClick={() => removeExtraFood(l.id)} aria-label={`Remove ${l.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-500/10 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setAddingFood(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-3 text-sm font-semibold text-neutral-600 hover:border-emerald-500 hover:text-emerald-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-emerald-400"
      >
        <Plus className="h-4 w-4" /> Add something you ate
      </button>
      {addingFood && <AddFoodSheet dateKey={today.key} onClose={closeAddFood} />}
      {addonFor && (
        <AddFoodSheet
          dateKey={today.key}
          onClose={closeAddon}
          title={`Add to ${addonFor.slot.toLowerCase()}`}
          subtitle={`Had something with ${addonFor.name}? It's added to this meal's totals.`}
          onSubmit={(item) => addMealAddon(today.key, addonFor, item)}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <button type="button" onClick={() => setCalc((v) => !v)} className="font-medium text-emerald-600 dark:text-emerald-400">
          {calc ? "Close" : "Adjust targets"}
        </button>
        {custom && (
          <button
            type="button"
            className="font-medium text-neutral-500"
            onClick={async () => {
              await setPreference("proteinTargetG", null);
              await setPreference("caloriesTarget", null);
            }}
          >
            Use diet plan
          </button>
        )}
      </div>
      {calc && (
        <div className="animate-fade-up mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <TargetsForm onSaved={() => setCalc(false)} />
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- week + weight

export function Week({ week, todayKey }) {
  return (
    <section className={card}>
      <Heading icon="flame" title="Last 7 days" sub="How much of your plan you followed" />
      <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3">
        {week.map((d) => {
          const isToday = d.key === todayKey;
          const h = d.pct == null ? 6 : Math.max(6, d.pct);
          return (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-semibold text-neutral-500 tabular-nums">{d.pct == null ? "–" : `${d.pct}%`}</span>
              <div className="flex h-24 w-full items-end">
                <div
                  className={`w-full rounded-lg transition-[height] duration-700 ease-out ${d.pct == null ? "bg-neutral-200 dark:bg-neutral-800" : d.pct >= 70 ? "bg-emerald-500" : d.pct > 0 ? "bg-amber-500" : "bg-rose-400/60"} ${isToday ? "ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900" : ""}`}
                  style={{ height: `${h}%` }}
                />
              </div>
              <span className={`text-xs ${isToday ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-neutral-500"}`}>{isToday ? "Today" : WEEKDAYS[d.date.getDay()]}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Bodyweight({ dateKey, current, previous }) {
  const [value, setValue] = useState("");
  const change = current && previous ? Math.round((current.weightKg - previous.weightKg) * 10) / 10 : null;

  async function save(e) {
    e.preventDefault();
    const weightKg = Number(value);
    if (!weightKg) return;
    if (current) await db.bodyMetrics.update(current.id, { weightKg });
    else await db.bodyMetrics.add({ id: uid(), date: dateKey, weightKg, createdAt: now() });
    setValue("");
  }

  return (
    <section className={card}>
      <Heading icon="up" title="Bodyweight" sub={previous ? `Last: ${previous.weightKg} kg on ${previous.date}` : "Log it to see the trend"} />
      {current ? (
        <p className="mt-4 text-3xl font-semibold tabular-nums">
          {current.weightKg} <span className="text-base font-normal text-neutral-500">kg today</span>
          {change != null && change !== 0 && <span className={`ml-2 text-sm font-semibold ${change < 0 ? "text-sky-600" : "text-amber-600"}`}>{change > 0 ? `+${change}` : change} kg</span>}
        </p>
      ) : null}
      <form onSubmit={save} className="mt-4 flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="20"
          max="400"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={current ? "Update today's weight" : "Today's weight (kg)"}
          className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-transparent px-3 text-base outline-none focus:border-emerald-500 dark:border-neutral-700"
        />
        <button type="submit" className="rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900">
          Save
        </button>
      </form>
    </section>
  );
}

function Heading({ icon, title, sub }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <h2 className="font-semibold break-words">{title}</h2>
        {sub && <p className="text-xs text-neutral-500">{sub}</p>}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[200, 320, 180].map((h) => (
        <div key={h} className="animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-900" style={{ height: h }} />
      ))}
    </div>
  );
}
