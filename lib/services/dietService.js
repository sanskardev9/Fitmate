import Dexie from "dexie";
import { db } from "@/lib/db/dexie";
import { uid, now } from "@/lib/utils";

export function listDietPlans({ includeArchived = false } = {}) {
  return db.dietPlans
    .orderBy("updatedAt")
    .reverse()
    .filter((p) => includeArchived || !p.archived)
    .toArray();
}

export async function createDietPlan({ name, notes = "", groceries = [] }) {
  const plan = { id: uid(), name, notes, groceries, archived: false, createdAt: now(), updatedAt: now() };
  await db.dietPlans.add(plan);
  return plan;
}

// Deletes a plan with its days and meals. Meal logs store their own macros, so history stays.
export async function deleteDietPlan(id) {
  await db.transaction("rw", db.dietPlans, db.dietDays, db.meals, async () => {
    await db.meals.where("planId").equals(id).delete();
    await db.dietDays.where("planId").equals(id).delete();
    await db.dietPlans.delete(id);
  });
}

export function updateDietPlan(id, changes) {
  return db.dietPlans.update(id, { ...changes, updatedAt: now() });
}

// Saves a plan built in the editor: { name, days: [{ name, weekdays, meals: [...] }] }.
export async function saveNewDietPlan({ name, notes = "", days, groceries = [] }) {
  return db.transaction("rw", db.dietPlans, db.dietDays, db.meals, async () => {
    const plan = await createDietPlan({ name, notes, groceries });
    for (const [order, day] of days.entries()) {
      const dayId = uid();
      await db.dietDays.add({ id: dayId, planId: plan.id, order, name: day.name, weekdays: day.weekdays });
      await db.meals.bulkAdd(
        day.meals.map((m, i) => ({
          id: uid(),
          planId: plan.id,
          dayId,
          order: i,
          slot: m.slot,
          name: m.name,
          serving: m.serving,
          calories: m.calories,
          proteinG: m.proteinG,
          carbsG: m.carbsG,
          fatG: m.fatG,
          recipe: m.recipe,
          videoUrl: m.videoUrl ?? "",
          category: m.category ?? "",
          diet: m.diet ?? "",
          videoSearch: m.videoSearch ?? "",
          timing: m.timing ?? "",
          alternatives: m.alternatives ?? [],
        })),
      );
    }
    return plan;
  });
}

export async function getMealsForWeekday(planId, weekday) {
  if (!planId) return [];
  const days = await db.dietDays.where("weekdays").equals(weekday).toArray();
  const day = days.find((d) => d.planId === planId);
  if (!day) return [];
  return db.meals.where("[dayId+order]").between([day.id, -Infinity], [day.id, Infinity]).toArray();
}

// A planned meal counts once a day. If it got logged twice (two devices or tabs ticking it before
// they synced), keep the first and remove the extra, so totals are never doubled.
export async function getMealLogsForDate(date) {
  const logs = await db.mealLogs.where("date").equals(date).toArray();
  const seen = new Map();
  const extra = [];
  for (const l of [...logs].sort((a, b) => String(a.loggedAt ?? "").localeCompare(String(b.loggedAt ?? "")) || String(a.id).localeCompare(String(b.id)))) {
    if (!l.mealId) continue; // extra foods ("Add something you ate") can repeat
    if (seen.has(l.mealId)) extra.push(l.id);
    else seen.set(l.mealId, l.id);
  }
  if (extra.length) {
    // Outside this read (it may run inside a live query, where writes aren't allowed).
    setTimeout(() => Dexie.ignoreTransaction(() => db.mealLogs.bulkDelete(extra)).catch(() => {}), 0); // syncs the clean-up
    return logs.filter((l) => !extra.includes(l.id));
  }
  return logs;
}

// Logs store a macro snapshot so later edits to the meal don't change past totals.
export async function logMeal(meal, date, portion = 1) {
  // Already ticked (maybe on another device): don't count it twice.
  const existing = await db.mealLogs.where("[date+mealId]").equals([date, meal.id]).first();
  if (existing) return existing;
  const log = {
    id: uid(),
    date,
    mealId: meal.id,
    name: meal.name,
    portion,
    calories: (meal.calories ?? 0) * portion,
    proteinG: (meal.proteinG ?? 0) * portion,
    carbsG: (meal.carbsG ?? 0) * portion,
    fatG: (meal.fatG ?? 0) * portion,
    // Snapshot so a swapped meal keeps its own recipe and video.
    recipe: meal.recipe ?? "",
    videoUrl: meal.videoUrl ?? "",
    loggedAt: now(),
  };
  await db.mealLogs.add(log);
  return log;
}

export async function unlogMeal(mealId, date) {
  await db.mealLogs.where("[date+mealId]").equals([date, mealId]).delete();
}

export function sumNutrition(logs) {
  return logs.reduce(
    (t, l) => ({
      calories: t.calories + (l.calories ?? 0),
      proteinG: t.proteinG + (l.proteinG ?? 0),
      carbsG: t.carbsG + (l.carbsG ?? 0),
      fatG: t.fatG + (l.fatG ?? 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

// Today's meal swaps: { [mealId]: chosen meal }. Choosing a swap never marks a meal as eaten.
const swapKey = (date) => `mealSwaps_${date}`;
export async function setMealSwap(date, mealId, choice) {
  const row = await db.preferences.get(swapKey(date));
  const swaps = { ...(row?.value ?? {}) };
  if (choice) {
    const { name, serving, calories, proteinG, carbsG, fatG, recipe, videoUrl, videoSearch } = choice;
    swaps[mealId] = { name, serving: serving ?? "", calories: calories ?? 0, proteinG: proteinG ?? 0, carbsG: carbsG ?? 0, fatG: fatG ?? 0, recipe: recipe ?? "", videoUrl: videoUrl ?? "", videoSearch: videoSearch ?? "" };
  } else delete swaps[mealId];
  await db.preferences.put({ key: swapKey(date), value: swaps });
  // Already eaten? Keep it eaten, but as the newly chosen meal.
  const eaten = await db.mealLogs.where("[date+mealId]").equals([date, mealId]).first();
  if (eaten) {
    await unlogMeal(mealId, date);
    const base = choice ?? (await db.meals.get(mealId));
    if (base) {
      await logMeal({ ...base, id: mealId }, date);
      // Keep add-ons (e.g. whey) on the swapped meal.
      const addons = eaten.addons ?? [];
      if (addons.length) {
        const fresh = await db.mealLogs.where("[date+mealId]").equals([date, mealId]).first();
        const sum = (k) => addons.reduce((t, x) => t + (x[k] ?? 0), 0);
        await db.mealLogs.update(fresh.id, { addons, calories: fresh.calories + sum("calories"), proteinG: fresh.proteinG + sum("proteinG"), carbsG: fresh.carbsG + sum("carbsG"), fatG: fresh.fatG + sum("fatG") });
      }
    }
  }
}

// Something eaten outside the plan. Counts toward today's totals (not "meals eaten").
const n = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? 0 : Number(v));
export async function logExtraFood(date, item) {
  const id = uid();
  await db.mealLogs.add({
    id,
    date,
    mealId: `extra:${id}`,
    extra: true,
    name: String(item.name).trim(),
    serving: String(item.serving ?? "").trim(),
    portion: 1,
    calories: n(item.calories),
    proteinG: n(item.proteinG),
    carbsG: n(item.carbsG),
    fatG: n(item.fatG),
    loggedAt: now(),
  });
}
export const removeExtraFood = (logId) => db.mealLogs.delete(logId);

// Extras eaten WITH a meal (e.g. whey with breakfast oats). Stored on that meal's log so the meal's
// totals include them. Adding one also marks the meal as eaten.
export async function addMealAddon(date, meal, item) {
  let log = await db.mealLogs.where("[date+mealId]").equals([date, meal.id]).first();
  if (!log) {
    await logMeal(meal, date);
    log = await db.mealLogs.where("[date+mealId]").equals([date, meal.id]).first();
  }
  const addon = { id: uid(), name: String(item.name).trim(), serving: String(item.serving ?? "").trim(), calories: n(item.calories), proteinG: n(item.proteinG), carbsG: n(item.carbsG), fatG: n(item.fatG) };
  await db.mealLogs.update(log.id, {
    addons: [...(log.addons ?? []), addon],
    calories: (log.calories ?? 0) + addon.calories,
    proteinG: (log.proteinG ?? 0) + addon.proteinG,
    carbsG: (log.carbsG ?? 0) + addon.carbsG,
    fatG: (log.fatG ?? 0) + addon.fatG,
  });
}

export async function removeMealAddon(logId, addonId) {
  const log = await db.mealLogs.get(logId);
  const addon = log?.addons?.find((a) => a.id === addonId);
  if (!addon) return;
  await db.mealLogs.update(logId, {
    addons: log.addons.filter((a) => a.id !== addonId),
    calories: Math.max(0, (log.calories ?? 0) - addon.calories),
    proteinG: Math.max(0, (log.proteinG ?? 0) - addon.proteinG),
    carbsG: Math.max(0, (log.carbsG ?? 0) - addon.carbsG),
    fatG: Math.max(0, (log.fatG ?? 0) - addon.fatG),
  });
}
