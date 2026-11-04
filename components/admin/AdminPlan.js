"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Utensils, Timer, Repeat } from "lucide-react";
import { useAdminData, adminApi } from "./AdminShell";
import { card, WEEKDAYS, fullDate, userName, PageTitle, Skeleton } from "./ui";

const SECTIONS = [
  ["warmup", "Warm-up"],
  ["main", "Main"],
  ["cooldown", "Cool-down"],
];
const rest = (s) => (!s ? null : s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s}s`);

// Read-only view of one user's plan, day by day.
export default function AdminPlan({ userId, planId }) {
  const { users } = useAdminData();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [day, setDay] = useState(0);

  useEffect(() => {
    adminApi(`/api/admin/users/${userId}/plans/${planId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [userId, planId]);

  const owner = users?.find((u) => u.user_id === userId);
  const back = { href: `/admin/users/${userId}`, label: owner ? userName(owner) : "User" };
  if (error) return <PageTitle back={back} title="Couldn't open this plan" sub={error} />;
  if (!data) return <><Skeleton className="h-16" /><Skeleton className="mt-4 h-96" /></>;

  const { kind, plan, days } = data;
  const d = days[day];
  const Icon = kind === "workout" ? Dumbbell : Utensils;

  return (
    <>
      <PageTitle back={back} title={plan.name || "Untitled plan"} sub={`${kind === "workout" ? "Workout" : "Diet"} plan · ${days.length} days${plan.createdAt ? ` · created ${fullDate(plan.createdAt)}` : ""}${plan.archived ? " · archived" : ""}`}>
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${kind === "workout" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
          <Icon className="h-6 w-6" />
        </span>
      </PageTitle>
      {plan.notes && <p className={`${card} mb-4 p-4 text-sm whitespace-pre-line text-neutral-600 dark:text-neutral-300`}>{plan.notes}</p>}

      {days.length === 0 ? (
        <p className={`${card} p-8 text-center text-sm text-neutral-500`}>This plan has no days yet.</p>
      ) : (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {days.map((x, i) => (
              <button key={x.id} type="button" onClick={() => setDay(i)} className={`shrink-0 rounded-xl border px-3.5 py-2 text-left text-sm transition-colors ${i === day ? "border-emerald-500 bg-emerald-500/10" : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"}`}>
                <span className="block font-semibold">{x.weekdays?.length ? x.weekdays.map((w) => WEEKDAYS[w]).join(", ") : `Day ${i + 1}`}</span>
                <span className="block max-w-[14rem] text-xs text-neutral-500">{x.name}</span>
              </button>
            ))}
          </div>

          <div key={d.id} className="animate-fade-up mt-4 [animation-duration:250ms]">
            <h2 className="mb-3 text-lg font-semibold break-words">{d.name}</h2>
            {kind === "workout" ? <WorkoutDay items={d.items} /> : <DietDay items={d.items} />}
          </div>
        </>
      )}
    </>
  );
}

function WorkoutDay({ items }) {
  if (!items.length) return <p className={`${card} p-6 text-center text-sm text-neutral-500`}>Rest day.</p>;
  return (
    <div className="space-y-4">
      {SECTIONS.map(([key, label]) => {
        const list = items.filter((e) => (e.section ?? "main") === key);
        if (!list.length) return null;
        return (
          <div key={key} className={`${card} overflow-hidden`}>
            <p className="border-b border-neutral-200 px-4 py-2.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:border-neutral-800">{label}</p>
            <ol className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {list.map((e, i) => (
                <li key={e.id} className="flex gap-3 px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500 tabular-nums dark:bg-neutral-800">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{e.name}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-neutral-500">
                      <span className="flex items-center gap-1 font-semibold text-neutral-800 tabular-nums dark:text-neutral-200">
                        <Repeat className="h-3.5 w-3.5" />
                        {e.sets ?? "–"} × {e.type === "hold" ? `${e.holdSec ?? "–"}s hold` : `${e.reps ?? "–"} reps`}
                      </span>
                      {e.weight ? <span className="tabular-nums">{e.weight} {e.weightUnit ?? "kg"}</span> : null}
                      {rest(e.restSec) && (
                        <span className="flex items-center gap-1 tabular-nums">
                          <Timer className="h-3.5 w-3.5" /> rest {rest(e.restSec)}
                        </span>
                      )}
                    </p>
                    {e.notes && <p className="mt-1 text-xs text-neutral-500">{e.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

const DIET = { veg: ["Veg", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"], egg: ["Egg", "bg-amber-500/15 text-amber-700 dark:text-amber-300"], nonveg: ["Non-veg", "bg-rose-500/15 text-rose-700 dark:text-rose-300"], vegan: ["Vegan", "bg-lime-500/15 text-lime-700 dark:text-lime-300"] };

function DietDay({ items }) {
  if (!items.length) return <p className={`${card} p-6 text-center text-sm text-neutral-500`}>No meals on this day.</p>;
  const total = (k) => Math.round(items.reduce((t, m) => t + (Number(m[k]) || 0), 0));
  return (
    <>
      <div className="mb-3 grid grid-cols-4 gap-2 text-center">
        {[
          ["kcal", total("calories")],
          ["protein", `${total("proteinG")} g`],
          ["carbs", `${total("carbsG")} g`],
          ["fat", `${total("fatG")} g`],
        ].map(([l, v]) => (
          <div key={l} className={`${card} px-1 py-2.5`}>
            <p className="text-base font-bold tabular-nums">{v}</p>
            <p className="text-[11px] text-neutral-500">{l}</p>
          </div>
        ))}
      </div>
      <ul className="space-y-3">
        {items.map((m) => (
          <li key={m.id} className={`${card} p-4`}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold tracking-wider text-neutral-500 uppercase">{m.slot || "Meal"}</span>
              {m.timing && <span className="text-neutral-400">{m.timing}</span>}
              {DIET[m.diet] && <span className={`rounded-full px-2 py-0.5 font-semibold ${DIET[m.diet][1]}`}>{DIET[m.diet][0]}</span>}
              {m.category && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{m.category}</span>}
            </div>
            <p className="mt-1.5 font-semibold break-words">{m.name}</p>
            {m.serving && <p className="text-sm text-neutral-500">{m.serving}</p>}
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
              <span><b>{m.calories ?? "–"}</b> kcal</span>
              <span><b>{m.proteinG ?? "–"}</b> g protein</span>
              <span className="text-neutral-500">{m.carbsG ?? "–"} g carbs</span>
              <span className="text-neutral-500">{m.fatG ?? "–"} g fat</span>
            </p>
            {(m.recipe || m.alternatives?.length) && (
              <details className="group mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-800/50">
                <summary className="cursor-pointer font-semibold text-emerald-700 select-none dark:text-emerald-400">
                  Recipe{m.alternatives?.length ? ` & ${m.alternatives.length} swaps` : ""}
                </summary>
                {m.recipe && <p className="mt-2 whitespace-pre-line text-neutral-600 dark:text-neutral-300">{m.recipe}</p>}
                {m.alternatives?.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-neutral-200 pt-2 dark:border-neutral-700">
                    {m.alternatives.map((a, i) => (
                      <li key={i} className="flex flex-wrap justify-between gap-x-3">
                        <span className="break-words">{a.name}</span>
                        <span className="text-xs text-neutral-500 tabular-nums">{a.calories ?? "–"} kcal · {a.proteinG ?? "–"} g protein</span>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
