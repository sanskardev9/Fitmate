import { db } from "@/lib/db/dexie";
import { uid, now } from "@/lib/utils";

export function listWorkoutPlans({ includeArchived = false } = {}) {
  return db.workoutPlans
    .orderBy("updatedAt")
    .reverse()
    .filter((p) => includeArchived || !p.archived)
    .toArray();
}

export async function createWorkoutPlan({ name, notes = "" }) {
  const plan = { id: uid(), name, notes, archived: false, createdAt: now(), updatedAt: now() };
  await db.workoutPlans.add(plan);
  return plan;
}

// Saves a plan built in the editor: { name, days: [{ name, weekdays, exercises: [...] }] }.
export async function saveNewWorkoutPlan({ name, notes = "", days }) {
  return db.transaction("rw", db.workoutPlans, db.trainingDays, db.exercises, async () => {
    const plan = await createWorkoutPlan({ name, notes });
    for (const [order, day] of days.entries()) {
      const dayId = uid();
      await db.trainingDays.add({ id: dayId, planId: plan.id, order, name: day.name, weekdays: day.weekdays });
      await db.exercises.bulkAdd(
        day.exercises.map((ex, i) => ({
          id: uid(),
          planId: plan.id,
          dayId,
          order: i,
          name: ex.name,
          type: ex.type,
          sets: ex.sets,
          reps: ex.reps,
          holdSec: ex.holdSec,
          targetUnit: ex.targetUnit,
          restSec: ex.restSec,
          restUnit: ex.restUnit,
          weight: ex.weight,
          weightUnit: ex.weightUnit,
          alternatives: ex.alternatives ?? [],
          notes: ex.notes,
          section: ex.section ?? "main",
        })),
      );
    }
    return plan;
  });
}

// Deletes a plan with its days and exercises. Logged sessions keep their own snapshot, so history stays.
export async function deleteWorkoutPlan(id) {
  await db.transaction("rw", db.workoutPlans, db.trainingDays, db.exercises, async () => {
    await db.exercises.where("planId").equals(id).delete();
    await db.trainingDays.where("planId").equals(id).delete();
    await db.workoutPlans.delete(id);
  });
}

export function updateWorkoutPlan(id, changes) {
  return db.workoutPlans.update(id, { ...changes, updatedAt: now() });
}

export function getDaysForPlan(planId) {
  return db.trainingDays.where("[planId+order]").between([planId, -Infinity], [planId, Infinity]).toArray();
}

export function getExercisesForDay(dayId) {
  return db.exercises.where("[dayId+order]").between([dayId, -Infinity], [dayId, Infinity]).toArray();
}

// The training day of the given plan scheduled for a weekday (0 = Sun), or null for rest.
export async function getDayForWeekday(planId, weekday) {
  if (!planId) return null;
  const days = await db.trainingDays.where("weekdays").equals(weekday).toArray();
  return days.find((d) => d.planId === planId) ?? null;
}

// Deep copy of a plan with fresh ids. History is untouched because it references old ids.
export async function duplicateWorkoutPlan(planId, name) {
  return db.transaction("rw", db.workoutPlans, db.trainingDays, db.exercises, async () => {
    const plan = await db.workoutPlans.get(planId);
    const copy = { ...plan, id: uid(), name: name ?? `${plan.name} (copy)`, createdAt: now(), updatedAt: now() };
    await db.workoutPlans.add(copy);
    for (const day of await getDaysForPlan(planId)) {
      await copyDay(day, copy.id, day.order);
    }
    return copy;
  });
}

export async function duplicateTrainingDay(dayId, targetPlanId) {
  return db.transaction("rw", db.trainingDays, db.exercises, async () => {
    const day = await db.trainingDays.get(dayId);
    const planId = targetPlanId ?? day.planId;
    const order = await db.trainingDays.where("planId").equals(planId).count();
    return copyDay({ ...day, name: targetPlanId ? day.name : `${day.name} (copy)`, weekdays: [] }, planId, order);
  });
}

async function copyDay(day, planId, order) {
  const newDay = { ...day, id: uid(), planId, order };
  await db.trainingDays.add(newDay);
  const exercises = await getExercisesForDay(day.id);
  await db.exercises.bulkAdd(exercises.map((e) => ({ ...e, id: uid(), dayId: newDay.id, planId })));
  return newDay;
}
