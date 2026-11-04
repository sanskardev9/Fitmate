"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, X, RotateCcw } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { setMealSwap } from "@/lib/services/dietService";
import { categoryOf } from "@/lib/diet/categories";
import { dishName } from "@/lib/diet/dishName";
import { allowedDiets, avoidRegexes, similarDishes } from "@/lib/services/dishCatalog";

// Bottom sheet to swap a planned meal: its own alternatives, the same slot on other days, and
// their alternatives. Closest protein first. Choosing only changes today's meal (✓ marks it eaten).
export default function MealSwapSheet({ meal, dateKey, chosen, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [cat, setCat] = useState("All");
  useEffect(() => {
    setMounted(true);
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const options = useLiveQuery(async () => {
    const fromPlan = (meal.alternatives ?? []).map((a) => ({ ...a, source: "Alternative" }));
    const sameSlot = meal.planId ? await db.meals.where("planId").equals(meal.planId).filter((x) => x.slot === meal.slot && x.id !== meal.id).toArray() : [];
    const otherDays = sameSlot.flatMap((x) => [{ ...x, source: "From another day" }, ...(x.alternatives ?? []).map((alt) => ({ ...alt, source: "Alternative" }))]);
    const seen = new Set([dishName(meal.name).toLowerCase()]);
    const out = [];
    for (const o of [...fromPlan, ...otherDays]) {
      const k = dishName(o.name).toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(o);
    }
    // Nothing the user avoids (incl. whey unless they have it) — for the plan's own swaps too,
    // so every option's numbers are reachable with real food.
    const avoid = await avoidRegexes().catch(() => []);
    for (let i = out.length - 1; i >= 0; i--) if (avoid.some((re) => re.test(`${out[i].name} ${out[i].recipe ?? ""}`))) out.splice(i, 1);
    // Shared dishes from other FitMate plans: only allowed diet types, nothing the user avoids, close nutrition.
    try {
      const diets = await allowedDiets(meal.planId);
      const shared = await similarDishes(meal, diets, avoid);
      for (const o of shared) {
        const k = o.name.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ ...o, source: "shared" });
      }
    } catch {}
    const p = Number(meal.proteinG) || 0;
    return out.sort((a, b) => Math.abs((Number(a.proteinG) || 0) - p) - Math.abs((Number(b.proteinG) || 0) - p));
  }, [meal.id, meal.planId]);

  async function choose(alt) {
    await setMealSwap(dateKey, meal.id, alt);
    onClose();
  }

  if (!mounted) return null;
  const current = chosen ?? meal;
  // Categories come only from the plan JSON; without them, no chips (nothing is guessed).
  const withCat = (options ?? []).map((o) => ({ ...o, cat: categoryOf(o) ?? "Other" }));
  const hasCats = (options ?? []).some((o) => categoryOf(o));
  const counts = withCat.reduce((m, o) => ({ ...m, [o.cat]: (m[o.cat] ?? 0) + 1 }), {});
  const cats = Object.keys(counts).sort((a, b) => (a === "Other") - (b === "Other") || counts[b] - counts[a]);
  const shown = cat === "All" ? withCat : withCat.filter((o) => o.cat === cat);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Swap ${meal.slot.toLowerCase()}`}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-up flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl sm:max-h-[80vh] sm:max-w-3xl bg-white pb-[env(safe-area-inset-bottom)] [animation-duration:200ms] sm:rounded-3xl dark:bg-neutral-900"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-neutral-300 sm:hidden dark:bg-neutral-700" />
        <div className="flex items-start gap-3 border-b border-neutral-100 px-5 pt-3 pb-4 sm:px-6 sm:pt-5 dark:border-neutral-800">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">Swap {meal.slot}</p>
            <p className="mt-0.5 font-semibold break-words">{dishName(current.name)}</p>
            <p className="text-xs text-neutral-500 tabular-nums">
              {Math.round(current.proteinG ?? 0)} g protein · {Math.round(current.calories ?? 0)} kcal
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {hasCats && cats.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-3 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-6 dark:border-neutral-800">
            {["All", ...cats].map((c) => {
              const on = c === cat;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] leading-none font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${on ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"}`}
                >
                  {c}
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${on ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300"}`}>{c === "All" ? withCat.length : counts[c]}</span>
                </button>
              );
            })}
          </div>
        )}
        <ul className="grid flex-1 content-start gap-2 overflow-y-auto overscroll-contain px-4 py-3 sm:grid-cols-2 sm:px-6 sm:py-4">
          {chosen && (
            <li className="sm:col-span-2">
              <button type="button" onClick={() => choose(null)} className="flex w-full items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-3 py-3 text-left text-sm font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 break-words">Back to plan: {dishName(meal.name)}</span>
              </button>
            </li>
          )}
          {options === undefined && <li className="py-6 text-center text-sm text-neutral-500 sm:col-span-2">Loading…</li>}
          {options?.length === 0 && <li className="py-6 text-center text-sm text-neutral-500 sm:col-span-2">No other {meal.slot.toLowerCase()} options in this plan yet.</li>}
          {shown.map((o) => {
            const isCurrent = chosen?.name === o.name;
            return (
              <li key={o.name}>
                <button
                  type="button"
                  onClick={() => !isCurrent && choose(o)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/60 active:scale-[0.99] ${isCurrent ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium break-words">{dishName(o.name)}</span>
                    <span className="block text-xs text-neutral-500 tabular-nums">
                      {Math.round(o.proteinG ?? 0)} g protein · {Math.round(o.calories ?? 0)} kcal{hasCats && cat === "All" ? ` · ${o.cat}` : ""}
                    </span>
                  </span>
                  {isCurrent ? <Check className="h-5 w-5 shrink-0 text-emerald-600" /> : <span className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Choose</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
