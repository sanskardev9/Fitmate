import { db } from "@/lib/db/dexie";

// Weekly menu rotation: so the same food doesn't come back every week.
// Week 1 of a diet plan is the plan as written; week 2 uses each meal's first alternative, week 3
// the second, then it starts over. An alternative is only used if it still meets the plan's goals
// (at least 90% of the meal's protein, calories within 12%), otherwise that meal stays as planned.
// A swap you choose yourself always wins (including going back to the original).

const DAY = 86400000;
const mondayOf = (d) => {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.getTime();
};

// 0 for the plan's first week, 1 for the next, ...
export function weekIndex(date, startMs) {
  if (!startMs) return 0;
  return Math.max(0, Math.round((mondayOf(date) - mondayOf(startMs)) / (7 * DAY)));
}

function meetsGoals(meal, alt) {
  const p = Number(meal.proteinG) || 0;
  const c = Number(meal.calories) || 0;
  if (p && (Number(alt.proteinG) || 0) < p * 0.9) return false;
  if (c && Math.abs((Number(alt.calories) || 0) - c) > c * 0.12) return false;
  return true;
}

// The dish for this meal in a given week (null = the meal as planned).
export function rotationFor(meal, week) {
  const options = [null, ...(meal.alternatives ?? []).filter((a) => a?.name && meetsGoals(meal, a))];
  return options[week % options.length];
}

const asSwap = ({ name, serving, calories, proteinG, carbsG, fatG, recipe, videoUrl, videoSearch }) => ({
  name,
  serving: serving ?? "",
  calories: calories ?? 0,
  proteinG: proteinG ?? 0,
  carbsG: carbsG ?? 0,
  fatG: fatG ?? 0,
  recipe: recipe ?? "",
  videoUrl: videoUrl ?? "",
  videoSearch: videoSearch ?? "",
  rotated: true,
});

const startCache = new Map();
async function planStart(planId) {
  if (!planId) return null;
  if (!startCache.has(planId)) {
    const plan = await db.dietPlans.get(planId);
    startCache.set(planId, plan?.createdAt ? new Date(plan.createdAt).getTime() : null);
  }
  return startCache.get(planId);
}

// What each meal actually is on a date: your own swaps first, then the week's rotation.
// stored = the day's saved swaps ({ [mealId]: meal | { original: true } }).
export async function effectiveSwaps(planId, meals, date, stored = {}) {
  const week = weekIndex(date, await planStart(planId));
  const out = {};
  for (const m of meals) {
    const own = stored?.[m.id];
    if (own?.original) continue; // chose the planned meal on purpose
    if (own?.name) {
      out[m.id] = own;
      continue;
    }
    const alt = rotationFor(m, week);
    if (alt) out[m.id] = asSwap(alt);
  }
  return out;
}

export async function rotationWeek(planId, date = new Date()) {
  return weekIndex(date, await planStart(planId));
}
