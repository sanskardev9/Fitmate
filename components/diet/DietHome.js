"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown, Utensils } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { loadDaily } from "@/lib/services/insights";
import { getMealsForWeekday, getMealLogsForDate, sumNutrition } from "@/lib/services/dietService";
import { todayKey } from "@/lib/utils";
import PageHeader from "@/components/common/PageHeader";
import { Nutrition } from "@/components/tracker/DailyTracker";
import { useServerReady, LoadingPlans } from "@/components/sync/SyncProvider";
import { dishName } from "@/lib/diet/dishName";

// Only real days: from the plan's start (or account start), plus any day with logged meals.
async function loadHistory(planId, since, days = 14) {
  const out = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const [meals, logs] = await Promise.all([getMealsForWeekday(planId, d.getDay()), getMealLogsForDate(key)]);
    if (!logs.length && (!meals.length || (since && d.getTime() < since))) continue;
    out.push({ key, date: d, planned: meals.length, eaten: meals.filter((m) => logs.some((l) => l.mealId === m.id)).length, logs, totals: sumNutrition(logs) });
  }
  return out;
}

async function load() {
  const daily = await loadDaily();
  const plan = daily.prefs.activeDietPlanId ? await db.dietPlans.get(daily.prefs.activeDietPlanId) : null;
  const start = plan?.createdAt ? new Date(plan.createdAt) : null;
  start?.setHours(0, 0, 0, 0);
  return { daily, plan, history: await loadHistory(daily.prefs.activeDietPlanId, start?.getTime() ?? Date.now()) };
}

// Diet tab: tick off today's meals, then look back at what you actually ate.
export default function DietHome() {
  const data = useLiveQuery(load, []);
  const ready = useServerReady();
  if (!data) return <PageHeader title="Diet" icon={Utensils} />;
  const { daily, plan, history } = data;

  return (
    <>
      <PageHeader title="Diet" subtitle={plan?.name} icon={Utensils} />
      {!plan && !ready ? (
        <LoadingPlans />
      ) : !plan ? (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold">No diet plan yet</h2>
          <p className="mt-1 text-sm text-neutral-500">Bring in your plan or create one with AI, then tick off meals here.</p>
          <Link href="/plans/import?kind=diet" className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white">
            Add diet plan
          </Link>
        </div>
      ) : (
        <Nutrition data={daily} />
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Past days</h2>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">Days you follow will show up here.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((d) => (
              <HistoryDay key={d.key} day={d} proteinTarget={daily.targets.proteinG} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function HistoryDay({ day, proteinTarget }) {
  const [open, setOpen] = useState(false);
  const pct = day.planned ? Math.round((day.eaten / day.planned) * 100) : day.logs.length ? 100 : 0;
  return (
    <li className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 px-4 py-3 text-left">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold ${pct >= 90 ? "bg-emerald-500/15 text-emerald-600" : pct >= 50 ? "bg-amber-500/15 text-amber-600" : "bg-rose-500/15 text-rose-600"}`}>{pct}%</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{day.date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</span>
          <span className="text-xs text-neutral-500 tabular-nums">
            {day.planned ? `${day.eaten}/${day.planned} meals` : `${day.logs.length} meals`} · {Math.round(day.totals.proteinG)}
            {proteinTarget ? `/${Math.round(proteinTarget)}` : ""} g protein · {Math.round(day.totals.calories)} kcal
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="animate-fade-up space-y-1 border-t border-neutral-100 px-4 py-3 text-sm dark:border-neutral-800">
          {day.logs.length === 0 && <li className="text-neutral-500">Nothing logged.</li>}
          {day.logs.map((l) => (
            <li key={l.id} className="flex justify-between gap-3">
              <span className="min-w-0 break-words">{dishName(l.name)}</span>
              <span className="shrink-0 text-neutral-500 tabular-nums">{Math.round(l.proteinG)} g</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
