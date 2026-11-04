"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ShoppingBasket, ChevronRight, ChevronDown } from "lucide-react";
import { upcomingMeals, friendlyRecipe } from "@/lib/diet/groceries";
import RecipeVideo from "./RecipeVideo";
import { dishName } from "@/lib/diet/dishName";

// The coming week at a glance (so you can prep and shop), plus the way into the grocery list.
export default function WeekAhead({ planId }) {
  const days = useLiveQuery(() => upcomingMeals(planId, 7), [planId]);
  const [pick, setPick] = useState(1); // tomorrow
  const [open, setOpen] = useState(null); // meal showing its recipe + video
  if (!days) return null;
  const day = days[pick];
  const label = (d, i) => (i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.date.toLocaleDateString(undefined, { weekday: "short" }));
  const totals = day.meals.reduce((t, m) => ({ kcal: t.kcal + (Number(m.calories) || 0), p: t.p + (Number(m.proteinG) || 0) }), { kcal: 0, p: 0 });

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-500">This week</h2>
        <Link href="/diet/groceries" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          <ShoppingBasket className="h-4 w-4" /> Grocery list
        </Link>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
        {days.map((d, i) => (
          <button
            key={d.key}
            type="button"
            onClick={() => {
              setPick(i);
              setOpen(null);
            }}
            className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-colors ${pick === i ? "border-emerald-500 bg-emerald-500/10" : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"}`}
          >
            <span className={`block text-sm font-semibold ${pick === i ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{label(d, i)}</span>
            <span className="block text-[11px] text-neutral-500">{d.date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {day.meals.length === 0 ? (
          <p className="p-5 text-center text-sm text-neutral-500">No meals planned for this day.</p>
        ) : (
          <>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {day.meals.map((m) => (
                <li key={m.id} className="px-4 py-3">
                  {/* Tap a meal: its ingredients, steps and video, same as Today's meals. */}
                  <button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} aria-expanded={open === m.id} className="flex w-full items-start gap-3 text-left">
                    <span className="w-20 shrink-0 pt-0.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase">{m.slot || "Meal"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium break-words">{dishName(m.name)}</span>
                      {m.serving && <span className="block text-xs text-neutral-500">{m.serving}</span>}
                    </span>
                    <span className="shrink-0 text-right text-xs text-neutral-500 tabular-nums">
                      {m.calories ?? "–"} kcal
                      <br />
                      {m.proteinG ?? "–"} g protein
                    </span>
                    <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open === m.id ? "rotate-180" : ""}`} />
                  </button>
                  {open === m.id && (
                    <div className="animate-fade-up mt-3 space-y-2 sm:ml-[5.75rem]">
                      {m.recipe && <p className="rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed whitespace-pre-line text-neutral-600 dark:bg-neutral-950 dark:text-neutral-400">{friendlyRecipe(m.recipe)}</p>}
                      <RecipeVideo key={m.name} url={m.videoUrl} dish={m.name} search={m.videoSearch} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-500 tabular-nums dark:border-neutral-800">
              {label(day, pick)}: {Math.round(totals.kcal)} kcal · {Math.round(totals.p)} g protein
            </p>
          </>
        )}
      </div>
      <Link href="/diet/groceries" className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
        See everything you need to buy <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
