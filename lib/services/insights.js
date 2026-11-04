import { db } from "@/lib/db/dexie";
import { getPreferences } from "./preferencesService";
import { getDayForWeekday, getExercisesForDay } from "./workoutService";
import { getMealsForWeekday, getMealLogsForDate, sumNutrition } from "./dietService";
import { lastPerformance } from "./sessionService";
import { todayKey } from "@/lib/utils";
import { isMain, inferSections } from "@/lib/workout/sections";

// Everything the daily tracker shows, computed from local data. "Follow-through" is
// (sets done + meals eaten) / (sets planned + meals planned) for a day.

const metric = (s) => s.holdSec ?? s.reps ?? 0;

async function sessionsOn(key) {
  return db.workoutSessions.filter((s) => !s.discardedAt && todayKey(new Date(s.startedAt)) === key).toArray();
}

// Planned vs done for one calendar day (used for today and the week strip).
export async function dayStats(prefs, date) {
  const key = todayKey(date);
  const weekday = date.getDay();
  const day = await getDayForWeekday(prefs.activeWorkoutPlanId, weekday);
  const exercises = day ? await getExercisesForDay(day.id) : [];
  const sessions = await sessionsOn(key);
  // The day is scored on ONE workout: the one with the most sets logged (ties: the latest).
  // Extra or abandoned sessions (restarts, a different day tried, duplicates) don't inflate the total.
  // Only main work counts; warm-up and cool-down sets are logged but not scored.
  const counts = await Promise.all(
    sessions.map((s) => {
      const main = new Set(inferSections(s.plan ?? []).filter(isMain).map((e) => e.exerciseId));
      return db.sessionSets.where("sessionId").equals(s.id).filter((x) => main.has(x.exerciseId)).count();
    }),
  );
  let main = null;
  sessions.forEach((s, i) => {
    if (!main || counts[i] > main.count || (counts[i] === main.count && s.startedAt > main.session.startedAt)) main = { session: s, count: counts[i] };
  });
  const doneSets = main?.count ?? 0;
  const mainPlanned = inferSections(main?.session.plan ?? []).filter(isMain).reduce((m, e) => m + (e.sets ?? 0), 0) ?? 0;
  // Extra sets you add raise the total, so it never reads like 16/15.
  const plannedSets = Math.max(main ? mainPlanned : inferSections(exercises).filter(isMain).reduce((n, e) => n + (e.sets ?? 0), 0), doneSets);
  const meals = await getMealsForWeekday(prefs.activeDietPlanId, weekday);
  const logs = await getMealLogsForDate(key);
  const eatenPlanned = meals.filter((m) => logs.some((l) => l.mealId === m.id)).length;
  const planned = Math.max(plannedSets, doneSets) + meals.length;
  const done = doneSets + eatenPlanned;
  // Days before the plans existed had nothing to follow: no score, not 0%.
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const plansStart = await plansCreatedAt(prefs);
  const before = plansStart != null && endOfDay.getTime() < plansStart && !doneSets && !logs.length;
  return { key, date, day, exercises, plannedSets, doneSets, mainSession: main?.session ?? null, sessions, meals, logs, eatenPlanned, pct: planned && !before ? Math.round((done / planned) * 100) : null };
}

async function plansCreatedAt(prefs) {
  const [w, d] = await Promise.all([
    prefs.activeWorkoutPlanId ? db.workoutPlans.get(prefs.activeWorkoutPlanId) : null,
    prefs.activeDietPlanId ? db.dietPlans.get(prefs.activeDietPlanId) : null,
  ]);
  const times = [w?.createdAt, d?.createdAt].filter(Boolean);
  return times.length ? Math.min(...times) : null;
}

export async function loadDaily(date = new Date()) {
  const prefs = await getPreferences();
  const today = await dayStats(prefs, date);

  // Workout outcome: what was logged today per exercise, vs plan and vs last time.
  const main = today.mainSession;
  const sessionIds = main ? [main.id] : [];
  const sets = sessionIds.length ? await db.sessionSets.where("sessionId").anyOf(sessionIds).toArray() : [];
  // Most recently ended workout today (there can be more than one).
  const finished = main?.finishedAt ? main : today.sessions.filter((s) => s.finishedAt).sort((a, b) => b.finishedAt - a.finishedAt)[0];
  const active = today.sessions.find((s) => !s.finishedAt);
  const planSource = (finished ?? active)?.plan ?? today.exercises.map((e) => ({ exerciseId: e.id, name: e.name, type: e.type, sets: e.sets, reps: e.reps, holdSec: e.holdSec, weight: e.weight ?? e.weightKg, weightUnit: e.weightUnit ?? "kg" }));

  const exercises = await Promise.all(
    planSource.map(async (p) => {
      const mine = sets.filter((s) => s.exerciseId === p.exerciseId || s.exerciseName === p.name).sort((a, b) => a.setNumber - b.setNumber);
      const last = await lastPerformance(p.name, finished?.id ?? active?.id);
      const target = p.type === "hold" ? p.holdSec : p.reps;
      const total = mine.reduce((n, s) => n + metric(s), 0);
      const lastTotal = last?.sets.reduce((n, s) => n + metric(s), 0) ?? null;
      // Personal best across all earlier sessions.
      const history = await db.sessionSets.where("exerciseName").equals(p.name).filter((s) => !sessionIds.includes(s.sessionId)).toArray();
      const prevBest = history.reduce((m, s) => Math.max(m, metric(s)), 0);
      const todayBest = mine.reduce((m, s) => Math.max(m, metric(s)), 0);
      return { ...p, target, done: mine, total, lastTotal, delta: lastTotal != null && mine.length ? total - lastTotal : null, pr: prevBest > 0 && todayBest > prevBest ? { value: todayBest, prev: prevBest } : null };
    }),
  );

  const workoutMinutes = finished ? Math.max(1, Math.round((finished.finishedAt - finished.startedAt) / 60000)) : null;

  // Nutrition: targets come from the user's own numbers, else the diet plan.
  const plannedNutrition = sumNutrition(today.meals);
  const eaten = sumNutrition(today.logs);
  const targets = {
    proteinG: prefs.proteinTargetG ?? plannedNutrition.proteinG,
    calories: prefs.caloriesTarget ?? plannedNutrition.calories,
    carbsG: prefs.carbsTargetG ?? plannedNutrition.carbsG,
    fatG: prefs.fatTargetG ?? plannedNutrition.fatG,
  };

  // Last 7 days for the week strip and streak.
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(date);
    d.setDate(d.getDate() - i);
    week.push(i === 0 ? today : await dayStats(prefs, d));
  }
  let streak = 0;
  for (let i = week.length - 1; i >= 0; i--) {
    const w = week[i];
    if (w.pct == null) continue; // nothing planned: doesn't break a streak
    if (w.pct >= 70) streak++;
    else if (i === week.length - 1) continue; // today still in progress
    else break;
  }

  const weights = await db.bodyMetrics.orderBy("date").reverse().limit(10).toArray();
  const weightToday = weights.find((w) => w.date === today.key) ?? null;
  const previousWeight = weights.find((w) => w.date !== today.key) ?? null;

  const swaps = prefs[`mealSwaps_${today.key}`] ?? {};
  return { prefs, today, swaps, exercises, finished, active, workoutMinutes, plannedNutrition, eaten, targets, week, streak, weightToday, previousWeight };
}

// Plain-language takeaways, most useful first.
export function buildInsights(d) {
  const out = [];
  const { today, exercises, finished, active, workoutMinutes, eaten, targets, streak } = d;

  if (!today.day && !today.sessions.length) out.push({ tone: "calm", icon: "moon", text: "Rest day. Recovery is part of the plan." });
  else if (finished) {
    const missed = Math.max(0, today.plannedSets - today.doneSets);
    out.push({
      tone: missed ? "warn" : "good",
      icon: "dumbbell",
      text: missed ? `Workout logged: ${today.doneSets}/${today.plannedSets} sets in ${workoutMinutes} min. ${missed} set${missed > 1 ? "s" : ""} skipped.` : `Workout done: all ${today.doneSets} sets in ${workoutMinutes} min.`,
    });
  } else if (active) {
    const left = exercises.filter((e) => e.done.length < e.sets).map((e) => e.name);
    out.push({ tone: "warn", icon: "dumbbell", text: `Workout in progress: ${today.doneSets}/${today.plannedSets} sets. Still to go: ${left.slice(0, 3).join(", ")}${left.length > 3 ? "…" : ""}.`, action: { href: "/session", label: "Resume" } });
  } else {
    out.push({ tone: "todo", icon: "dumbbell", text: `${today.day.name} is waiting: ${today.plannedSets} sets across ${today.exercises.length} exercises.`, action: { href: `/session?day=${today.day.id}`, label: "Start" } });
  }

  for (const e of exercises.filter((x) => x.pr)) {
    out.push({ tone: "good", icon: "trophy", text: `New best on ${e.name}: ${e.pr.value}${e.type === "hold" ? "s" : " reps"} (was ${e.pr.prev}).` });
  }
  const better = exercises.filter((e) => e.delta > 0).length;
  const worse = exercises.filter((e) => e.delta < 0);
  if (better && finished) out.push({ tone: "good", icon: "up", text: `You beat last time on ${better} exercise${better > 1 ? "s" : ""}.` });
  if (worse.length && finished) out.push({ tone: "warn", icon: "down", text: `Below last time on ${worse.map((e) => e.name).slice(0, 2).join(" and ")}. Check sleep and food if this repeats.` });

  if (targets.proteinG) {
    const left = Math.round(targets.proteinG - eaten.proteinG);
    if (left <= 0) out.push({ tone: "good", icon: "check", text: `Protein target hit: ${Math.round(eaten.proteinG)} g.` });
    else {
      const upcoming = today.meals.filter((m) => !today.logs.some((l) => l.mealId === m.id));
      const fromPlan = upcoming.reduce((n, m) => n + (Number(m.proteinG) || 0), 0);
      const text = upcoming.length
        ? fromPlan >= left
          ? `${left} g protein to go. Your remaining meals (${upcoming.map((m) => m.slot.toLowerCase()).join(", ")}) cover it.`
          : `${left} g protein to go, but your remaining meals only add ${fromPlan} g. Add a high-protein snack (curd, paneer, whey).`
        : `${left} g protein short today. A whey shake or 200 g Greek yogurt would close most of it.`;
      out.push({ tone: upcoming.length && fromPlan >= left ? "todo" : "warn", icon: "leaf", text });
    }
  }
  if (streak >= 2) out.push({ tone: "good", icon: "flame", text: `${streak}-day streak of following your plan.` });
  return out;
}
