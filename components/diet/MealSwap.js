"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Repeat2, Check } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { logMeal, unlogMeal } from "@/lib/services/dietService";

// Swap a planned meal for something else: the plan's own alternatives plus the same slot from
// other days of the plan. Eating a swap logs it under the planned meal, so it counts as followed.
export default function MealSwap({ meal, dateKey, eatenLog }) {
  const [open, setOpen] = useState(false);
  const options = useLiveQuery(async () => {
    const fromPlan = (meal.alternatives ?? []).map((a) => ({ ...a, source: "Swap" }));
    const sameSlot = meal.planId ? await db.meals.where("planId").equals(meal.planId).filter((x) => x.slot === meal.slot && x.id !== meal.id).toArray() : [];
    const seen = new Set([meal.name.toLowerCase()]);
    const out = [];
    for (const o of [...fromPlan, ...sameSlot.map((x) => ({ ...x, source: "Another day" }))]) {
      const k = String(o.name ?? "").toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(o);
    }
    // Closest protein first, so a swap keeps you on target.
    const p = Number(meal.proteinG) || 0;
    return out.sort((a, b) => Math.abs((Number(a.proteinG) || 0) - p) - Math.abs((Number(b.proteinG) || 0) - p));
  }, [meal.id, meal.planId]);

  if (!options?.length) return null;
  const swappedTo = eatenLog && eatenLog.name !== meal.name ? eatenLog.name : null;

  async function eat(alt) {
    await unlogMeal(meal.id, dateKey);
    await logMeal({ ...alt, id: meal.id }, dateKey);
    setOpen(false);
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-left text-sm font-semibold">
        <Repeat2 className="h-4 w-4 text-emerald-600" />
        <span className="flex-1">{swappedTo ? `Swapped to ${swappedTo}` : "Don't feel like this? Swap it"}</span>
        <span className="text-xs font-normal text-neutral-500">{options.length} options</span>
      </button>
      {open && (
        <ul className="animate-fade-up mt-3 space-y-2">
          {options.map((o) => {
            const current = eatenLog?.name === o.name;
            return (
              <li key={o.name} className="flex items-center gap-3 rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-950">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium break-words">{o.name}</span>
                  <span className="block text-xs text-neutral-500 tabular-nums">
                    {Math.round(o.proteinG ?? 0)} g protein · {Math.round(o.calories ?? 0)} kcal · {o.source}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => eat(o)}
                  disabled={current}
                  className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${current ? "bg-emerald-500 text-white" : "bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-300"}`}
                >
                  {current ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Eaten
                    </>
                  ) : (
                    "Eat this instead"
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
