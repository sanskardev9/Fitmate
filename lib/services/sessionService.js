import { db } from "@/lib/db/dexie";
import { getExercisesForDay } from "./workoutService";
import { uid, now, todayKey } from "@/lib/utils";
import { inferSections, isMain } from "@/lib/workout/sections";

const withSections = (s) => ({ ...s, plan: inferSections(s.plan ?? []) });

// Workout sessions are history: each one snapshots the planned exercises at start, so editing
// the plan later never changes what was planned (or done) that day.

// One start at a time: a double call (React dev mode, double tap) returns the same session
// instead of creating a duplicate.
let starting = null;
export function startSession(day) {
  if (starting) return starting;
  starting = createSession(day).finally(() => {
    starting = null;
  });
  return starting;
}

async function createSession(day) {
  const open = await getActiveSession();
  if (open && open.dayId === day.id) return open;
  const exercises = inferSections(await getExercisesForDay(day.id));
  const session = {
    id: uid(),
    planId: day.planId,
    dayId: day.id,
    dayName: day.name,
    startedAt: now(),
    finishedAt: null,
    plan: exercises.map((e) => ({
      exerciseId: e.id,
      name: e.name,
      type: e.type,
      sets: e.sets ?? 1,
      reps: e.reps ?? null,
      holdSec: e.holdSec ?? null,
      targetUnit: e.targetUnit ?? (e.type === "hold" ? "sec" : "reps"),
      restSec: e.restSec ?? 90,
      weight: e.weight ?? e.weightKg ?? null,
      weightUnit: e.weightUnit ?? "kg",
      notes: e.notes ?? "",
      section: e.section ?? "main",
      alternatives: e.alternatives ?? [],
    })),
  };
  await db.workoutSessions.add(session);
  return session;
}

// The unfinished session to resume, if any (most recent first).
// Swap an exercise in an ongoing workout for one of its alternatives (this workout only; the plan
// stays the same). The original becomes an alternative, so you can swap back.
export async function swapExercise(sessionId, exerciseId, alt) {
  const session = await db.workoutSessions.get(sessionId);
  if (!session) return null;
  const plan = session.plan.map((e) => {
    if (e.exerciseId !== exerciseId) return e;
    const original = { name: e.name, type: e.type, sets: e.sets, reps: e.reps, holdSec: e.holdSec, notes: e.notes };
    const type = alt.type === "hold" || (alt.holdSec && !alt.reps) ? "hold" : "reps";
    return {
      ...e,
      name: alt.name,
      type,
      targetUnit: type === "hold" ? "sec" : "reps",
      sets: alt.sets ?? e.sets,
      reps: type === "reps" ? alt.reps ?? e.reps : null,
      holdSec: type === "hold" ? alt.holdSec ?? e.holdSec : null,
      notes: alt.notes ?? "",
      swappedFrom: e.swappedFrom ?? e.name,
      alternatives: [original, ...(e.alternatives ?? []).filter((a) => a.name !== alt.name)],
    };
  });
  await db.workoutSessions.update(sessionId, { plan });
  return plan;
}

export async function getActiveSession() {
  const open = await db.workoutSessions.filter((s) => !s.finishedAt && !s.discardedAt).toArray();
  const latest = open.sort((a, b) => b.startedAt - a.startedAt)[0];
  return latest ? withSections(latest) : null;
}

export function getSessionSets(sessionId) {
  return db.sessionSets.where("[sessionId+order]").between([sessionId, -Infinity], [sessionId, Infinity]).toArray();
}

export async function logSet(session, exercise, { setNumber, reps, holdSec, weight }) {
  const count = await db.sessionSets.where("sessionId").equals(session.id).count();
  const row = {
    id: uid(),
    sessionId: session.id,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.name,
    order: count,
    setNumber,
    reps: exercise.type === "hold" ? null : reps,
    holdSec: exercise.type === "hold" ? holdSec : null,
    weight: weight || null,
    weightUnit: exercise.weightUnit,
    completedAt: now(),
  };
  await db.sessionSets.add(row);
  return row;
}

export const deleteSet = (setId) => db.sessionSets.delete(setId);
// Fix a logged set (did 10, not 12): reps or hold seconds, and weight.
export const updateSet = (setId, patch) => db.sessionSets.update(setId, patch);

export async function finishSession(sessionId, { effort, notes }) {
  await db.workoutSessions.update(sessionId, { finishedAt: now(), effort: effort ?? null, notes: notes ?? "" });
}

// Reopens an ended workout so logging continues where it stopped.
export async function reopenSession(sessionId) {
  await db.workoutSessions.update(sessionId, { finishedAt: null, effort: null, closedAt: null });
}

// Throws away an ended workout's sets and starts the same workout again from set 1.
// Uses the session's own snapshot, so it works even if the plan was edited or deleted.
export async function restartSession(session) {
  await discardSession(session.id);
  const fresh = { ...session, id: uid(), startedAt: now(), finishedAt: null, effort: null, notes: "", discardedAt: undefined, closedAt: null };
  delete fresh._ts;
  await db.workoutSessions.add(fresh);
  return fresh;
}

export async function discardSession(sessionId) {
  await db.transaction("rw", db.workoutSessions, db.sessionSets, async () => {
    await db.sessionSets.where("sessionId").equals(sessionId).delete();
    await db.workoutSessions.update(sessionId, { discardedAt: now() });
  });
}

// Sets from the most recent *other* finished session that included this exercise.
export async function lastPerformance(exerciseName, excludeSessionId) {
  const sets = await db.sessionSets.where("exerciseName").equals(exerciseName).toArray();
  const bySession = new Map();
  for (const s of sets) {
    if (s.sessionId === excludeSessionId) continue;
    if (!bySession.has(s.sessionId)) bySession.set(s.sessionId, []);
    bySession.get(s.sessionId).push(s);
  }
  let best = null;
  for (const [sessionId, list] of bySession) {
    const session = await db.workoutSessions.get(sessionId);
    if (!session?.finishedAt) continue;
    if (!best || session.startedAt > best.session.startedAt) best = { session, sets: list.sort((a, b) => a.setNumber - b.setNumber) };
  }
  return best;
}

export async function recentSessions(limit = 10) {
  const sessions = await db.workoutSessions.orderBy("startedAt").reverse().filter((s) => Boolean(s.finishedAt)).limit(limit).toArray();
  return Promise.all(
    sessions.map(async (s) => {
      const sets = await db.sessionSets.where("sessionId").equals(s.id).toArray();
      const mainPlan = inferSections(s.plan ?? []).filter(isMain);
      const mainIds = new Set(mainPlan.map((e) => e.exerciseId));
      const done = sets.filter((x) => mainIds.has(x.exerciseId)).length;
      const planned = mainPlan.reduce((n, e) => n + e.sets, 0);
      return { ...s, setsDone: done, setsPlanned: Math.max(planned, done) };
    }),
  );
}

export async function sessionsOn(date = new Date()) {
  const key = todayKey(date);
  return db.workoutSessions.filter((s) => !s.discardedAt && todayKey(new Date(s.startedAt)) === key).toArray();
}

// "I'm done for today": hides Continue / Start over for an ended workout. Synced like any session field.
export const closeSession = (sessionId) => db.workoutSessions.update(sessionId, { closedAt: Date.now() });
