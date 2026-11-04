"use client";

import { WEEKDAYS } from "@/lib/utils";
import { friendlyRecipe } from "@/lib/diet/groceries";
import { dishName } from "@/lib/diet/dishName";

// Read-only look at one diet day while importing or building a plan: totals, meals, recipes, swaps.
const DIET = { veg: ["Veg", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"], egg: ["Egg", "bg-amber-500/15 text-amber-700 dark:text-amber-300"], nonveg: ["Non-veg", "bg-rose-500/15 text-rose-700 dark:text-rose-300"], vegan: ["Vegan", "bg-lime-500/15 text-lime-700 dark:text-lime-300"] };
const num = (v) => Number(v) || 0;

export default function DietDayPreview({ day }) {
  const meals = day.meals.filter((m) => String(m.name ?? "").trim());
  const total = (k) => Math.round(meals.reduce((t, m) => t + num(m[k]), 0));
  const when = (day.weekdays ?? []).length ? day.weekdays.map((w) => WEEKDAYS[w]).join(", ") : "No days picked";

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="font-semibold break-words">{day.name}</p>
        <p className="text-xs text-neutral-500">{when}</p>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            ["kcal", total("calories")],
            ["protein", `${total("proteinG")} g`],
            ["carbs", `${total("carbsG")} g`],
            ["fat", `${total("fatG")} g`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-neutral-50 px-1 py-2 dark:bg-neutral-800/60">
              <p className="text-sm font-bold tabular-nums">{v}</p>
              <p className="text-[11px] text-neutral-500">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {meals.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">No meals on this day yet.</p>}

      {meals.map((m) => (
        <article key={m.key} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold tracking-wide text-neutral-500 uppercase">{m.slot || "Meal"}</span>
            {m.timing && <span className="text-neutral-400">{m.timing}</span>}
            {DIET[m.diet] && <span className={`rounded-full px-2 py-0.5 font-semibold ${DIET[m.diet][1]}`}>{DIET[m.diet][0]}</span>}
            {m.category && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{m.category}</span>}
          </div>
          <p className="mt-1.5 font-semibold break-words">{dishName(m.name)}</p>
          {m.serving && <p className="text-sm text-neutral-500">{m.serving}</p>}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
            <span>
              <b>{m.calories || "–"}</b> kcal
            </span>
            <span>
              <b>{m.proteinG || "–"}</b> g protein
            </span>
            <span className="text-neutral-500">{m.carbsG || "–"} g carbs</span>
            <span className="text-neutral-500">{m.fatG || "–"} g fat</span>
          </p>
          {m.recipe && <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed whitespace-pre-line text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">{friendlyRecipe(m.recipe)}</p>}
          {m.alternatives?.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-neutral-500">Swaps</p>
              <ul className="space-y-1">
                {m.alternatives.map((a, i) => (
                  <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg bg-neutral-50 px-3 py-1.5 text-sm dark:bg-neutral-800/50">
                    <span className="break-words">{dishName(a.name)}</span>
                    <span className="text-xs text-neutral-500 tabular-nums">
                      {a.calories ?? "–"} kcal · {a.proteinG ?? "–"} g protein
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
