import { db } from "@/lib/db/dexie";
import { uid, now } from "@/lib/utils";

export function listDietPlans({ includeArchived = false } = {}) {
  return db.dietPlans
    .orderBy("updatedAt")
    .reverse()
    .filter((p) => includeArchived || !p.archived)
    .toArray();
}

export async function createDietPlan({ name, notes = "" }) {
  const plan = { id: uid(), name, notes, archived: false, createdAt: now(), updatedAt: now() };
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
export async function saveNewDietPlan({ name, notes = "", days }) {
  return db.transaction("rw", db.dietPlans, db.dietDays, db.meals, async () => {
    const plan = await createDietPlan({ name, notes });
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

export function getMealLogsForDate(date) {
  return db.mealLogs.where("date").equals(date).toArray();
}

// Logs store a macro snapshot so later edits to the meal don't change past totals.
export async function logMeal(meal, date, portion = 1) {
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
