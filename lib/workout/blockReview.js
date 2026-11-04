import { db } from "@/lib/db/dexie";
import { getPreferences, setPreference } from "@/lib/services/preferencesService";
import { getMealsForWeekday } from "@/lib/services/dietService";
import { inferSections, isMain } from "@/lib/workout/sections";
import { blockWeek, BLOCK_WEEKS } from "./progression";
import { todayKey } from "@/lib/utils";

// End of a 4-week block: what happened, in numbers, and the same summary written for the AI so
// the next block builds on it (harder where you improved, fresh meals instead of the ones you
// kept swapping, calories from your weight trend).

const DAY = 86400000;

export async function blockReview(date = new Date()) {
  const prefs = await getPreferences();
  const planId = prefs.activeWorkoutPlanId;
  const block = await blockWeek(planId, date);
  // Due in the last weekend of week 4, and in week 1 of the next block until reviewed.
  const weekend = [0, 6].includes(date.getDay());
  const finished = block.week === 1 && block.block >= 2 ? block.block - 1 : block.week === BLOCK_WEEKS && weekend ? block.block : null;
  if (!finished || Number(prefs[`reviewedBlock_${planId}`] ?? 0) >= finished) return null;

  const since = date.getTime() - BLOCK_WEEKS * 7 * DAY;
  const sessions = (await db.workoutSessions.toArray()).filter((s) => s.finishedAt && s.startedAt >= since).sort((a, b) => a.startedAt - b.startedAt);
  const days = planId ? await db.trainingDays.where("planId").equals(planId).toArray() : [];
  const planned = days.reduce((n, d) => n + (d.weekdays?.length ?? 0), 0) * BLOCK_WEEKS;

  // Best per exercise per session (main set), first vs last time in the block.
  const firstLast = new Map();
  for (const s of sessions) {
    const main = new Set(inferSections(s.plan ?? []).filter(isMain).map((e) => e.name));
    const sets = await db.sessionSets.where("sessionId").equals(s.id).toArray();
    const best = {};
    for (const x of sets) {
      if (!main.has(x.exerciseName)) continue;
      const v = Number(x.holdSec || x.reps) || 0;
      const w = Number(x.weight) || 0;
      const unit = x.holdSec ? "s" : " reps";
      const cur = best[x.exerciseName];
      if (!cur || w > cur.w || (w === cur.w && v > cur.v)) best[x.exerciseName] = { v, w, unit };
    }
    for (const [name, b] of Object.entries(best)) {
      const e = firstLast.get(name);
      firstLast.set(name, e ? { ...e, last: b } : { first: b, last: b });
    }
  }
  const fmt = (b) => `${b.v}${b.unit}${b.w ? ` @ ${b.w} kg` : ""}`;
  const improved = [...firstLast.entries()]
    .filter(([, { first, last }]) => last.w > first.w || (last.w === first.w && last.v > first.v))
    .map(([name, { first, last }]) => ({ name, from: fmt(first), to: fmt(last) }))
    .slice(0, 6);

  // Weight change.
  const weights = (await db.bodyMetrics.orderBy("date").toArray()).filter((w) => new Date(`${w.date}T12:00:00`).getTime() >= since);
  const weight = weights.length >= 2 ? { from: weights[0].weightKg, to: weights.at(-1).weightKg } : null;

  // Diet: days every planned meal was eaten; meals you swapped away from most.
  let dietDays = 0;
  const swappedOut = {};
  for (let i = 0; i < BLOCK_WEEKS * 7; i++) {
    const d = new Date(date.getTime() - i * DAY);
    const key = todayKey(d);
    const meals = await getMealsForWeekday(prefs.activeDietPlanId, d.getDay());
    if (meals.length) {
      const logs = await db.mealLogs.where("date").equals(key).toArray();
      if (meals.every((m) => logs.some((l) => l.mealId === m.id))) dietDays++;
      for (const [mealId, chosen] of Object.entries(prefs[`mealSwaps_${key}`] ?? {})) {
        if (!chosen?.name || chosen.rotated) continue;
        const base = meals.find((m) => m.id === mealId);
        if (base) swappedOut[base.name] = (swappedOut[base.name] ?? 0) + 1;
      }
    }
  }
  const disliked = Object.entries(swappedOut)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([n]) => n);

  const review = { block: finished, planId, workouts: { done: sessions.length, planned }, improved, weight, dietDays, disliked };
  return { ...review, summary: summaryFor(review, prefs) };
}

// The same, written for the AI prompt.
function summaryFor(r, prefs) {
  const lines = [
    `Workouts done: ${r.workouts.done} of ${r.workouts.planned} planned.`,
    r.improved.length ? `Improved: ${r.improved.map((x) => `${x.name} ${x.from} -> ${x.to}`).join("; ")}. Progress these further (harder variations, more reps or weight).` : "No clear strength gains logged: keep the main lifts, adjust volume.",
    r.weight ? `Weight: ${r.weight.from} kg -> ${r.weight.to} kg over 4 weeks.` : null,
    `Diet: followed fully on ${r.dietDays} of 28 days.`,
    r.disliked.length ? `Meals I kept swapping away from (don't use them): ${r.disliked.join(", ")}.` : null,
    prefs.caloriesTarget ? `Current targets: ${prefs.caloriesTarget} kcal, ${prefs.proteinTargetG ?? "?"} g protein a day.` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export const markReviewed = (planId, block) => setPreference(`reviewedBlock_${planId}`, block);
