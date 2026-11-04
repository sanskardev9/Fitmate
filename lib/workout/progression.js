import { db } from "@/lib/db/dexie";
import { weekIndex } from "@/lib/diet/rotation";

// Progressive overload from what you actually logged, so every week asks a little more:
//  - hit every set last time -> +1 rep (holds +5 s), up to the top of the range (plan + 4 reps / +20 s)
//  - at the top: weighted moves add weight (+2.5 kg / +5 lb) and go back to the plan's reps;
//    bodyweight moves add one set (once), then it's time for a harder version
//  - missed reps -> same target again (beat it next time)
// Plans run in 4-week blocks; week 4 is lighter (about 60% of the sets, no increases) to recover.

export const BLOCK_WEEKS = 4;
const REP_RANGE = 4;
const HOLD_RANGE = 20;
const HOLD_STEP = 5;

export async function blockWeek(planId, date = new Date()) {
  const plan = planId ? await db.workoutPlans.get(planId) : null;
  const start = plan?.createdAt ? new Date(plan.createdAt).getTime() : null;
  const w = weekIndex(date, start); // 0-based weeks since the plan started
  return { week: (w % BLOCK_WEEKS) + 1, block: Math.floor(w / BLOCK_WEEKS) + 1, deload: w % BLOCK_WEEKS === BLOCK_WEEKS - 1 };
}

// The most recent finished session that has this exercise, with its sets and its target then.
async function lastTime(name, excludeSessionId) {
  const sets = await db.sessionSets.where("exerciseName").equals(name).toArray();
  const by = new Map();
  for (const s of sets) {
    if (s.sessionId === excludeSessionId) continue;
    (by.get(s.sessionId) ?? by.set(s.sessionId, []).get(s.sessionId)).push(s);
  }
  let best = null;
  for (const [id, list] of by) {
    const session = await db.workoutSessions.get(id);
    if (!session?.finishedAt) continue;
    if (!best || session.startedAt > best.session.startedAt) best = { session, sets: list };
  }
  if (!best) return null;
  const target = best.session.plan?.find((p) => p.name === name) ?? null;
  return { sets: best.sets, target };
}

const valueOf = (type, x) => Number(type === "hold" ? x?.holdSec : x?.reps) || 0;

// One exercise: the target for today, and what changed (for the badge).
export function progress(ex, last, { deload = false } = {}) {
  const hold = ex.type === "hold";
  const planValue = valueOf(ex.type, ex);
  if (!planValue) return { ...ex };
  const prevT = last?.target && last.target.type === ex.type ? last.target : null;
  // Start from last time's target, unless the plan itself now asks for more.
  const base = {
    sets: Math.max(ex.sets ?? 1, prevT?.sets ?? 0),
    value: Math.max(planValue, valueOf(ex.type, prevT)),
    weight: Math.max(Number(ex.weight) || 0, Number(prevT?.weight) || 0) || null,
  };
  const from = { sets: base.sets, value: base.value, weight: base.weight };
  const out = (sets, value, weight, change, note) => ({
    ...ex,
    sets,
    reps: hold ? null : value,
    holdSec: hold ? value : null,
    weight,
    progress: change ? { change, note, from } : null,
  });

  if (deload) return out(Math.max(1, Math.round(base.sets * 0.6)), base.value, base.weight, "deload", "Lighter week: fewer sets to recover");
  if (!last?.sets?.length || !prevT) return out(base.sets, base.value, base.weight, null, null);

  const done = last.sets.map((s) => valueOf(ex.type, s));
  const hitAll = done.length >= (prevT.sets ?? 1) && done.every((v) => v >= base.value);
  if (!hitAll) return out(base.sets, base.value, base.weight, "hold", `Same as last time (best ${Math.max(...done)}${hold ? "s" : ""}). Beat it today`);

  const top = planValue + (hold ? HOLD_RANGE : REP_RANGE);
  const step = hold ? HOLD_STEP : 1;
  if (base.value + step <= top) return out(base.sets, base.value + step, base.weight, "up", `+${step}${hold ? " s" : " rep"} from last time`);

  const weighted = base.weight || last.sets.some((s) => Number(s.weight) > 0);
  if (weighted) {
    const lastWeight = Math.max(base.weight || 0, ...last.sets.map((s) => Number(s.weight) || 0));
    const inc = (ex.weightUnit ?? "kg") === "lb" ? 5 : 2.5;
    return out(base.sets, planValue, lastWeight + inc, "level", `Heavier: +${inc} ${ex.weightUnit ?? "kg"}, back to ${planValue}${hold ? "s" : " reps"}`);
  }
  if (base.sets <= (ex.sets ?? 1)) return out(base.sets + 1, base.value, base.weight, "level", "+1 set: you've maxed the reps");
  return out(base.sets, base.value, base.weight, "max", "Mastered. Try a harder version (Swap)");
}

// Today's targets for a day's exercises (main set only; warm-up and cool-down stay as planned).
export async function progressedPlan(planId, exercises, excludeSessionId) {
  const { deload } = await blockWeek(planId);
  return Promise.all(
    exercises.map(async (ex) => {
      if ((ex.section ?? "main") !== "main") return ex;
      return progress(ex, await lastTime(ex.name, excludeSessionId), { deload });
    }),
  );
}
