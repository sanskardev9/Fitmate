import { getPreferences } from "./preferencesService";
import { dayStats } from "./insights";
import { todayKey } from "@/lib/utils";
import { reportStreak } from "./streakReport";

const LOOKBACK_DAYS = 60;

// Streak freezes, Duolingo-style: you can hold at most 2. You earn one for every 7 days you
// follow your plan in a row. A missed day uses one up automatically and the streak survives;
// the frozen day keeps the streak but does not add to it.
export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;

// A day keeps the streak when you followed it: 70%+ of the plan, or a finished workout with at
// least half its sets logged (ending after one set doesn't count).
// Days with nothing planned (rest days, before you had a plan) neither count nor break it.
// Today never breaks the streak while it is still today: the streak ends at midnight.
function statusOf(stats, isToday) {
  const finished = Boolean(stats.mainSession?.finishedAt) && stats.plannedSets > 0 && stats.doneSets / stats.plannedSets >= 0.5;
  if ((stats.pct != null && stats.pct >= 70) || finished) return "done";
  if (stats.pct == null) return "rest";
  return isToday ? "pending" : "missed";
}

// Walks the days in order: followed days grow the streak and earn freezes, missed days spend
// a freeze (status becomes "frozen") or reset the streak to 0.
function walk(days) {
  let current = 0;
  let best = 0;
  let freezes = 0;
  for (const d of days) {
    if (d.status === "done") {
      current++;
      best = Math.max(best, current);
      if (current % FREEZE_EVERY === 0 && freezes < MAX_FREEZES) {
        freezes++;
        d.earnedFreeze = true;
      }
    } else if (d.status === "missed") {
      if (current > 0 && freezes > 0) {
        freezes--;
        d.status = "frozen";
      } else {
        current = 0;
      }
    }
  }
  return { current, best, freezes };
}

export async function loadStreak(date = new Date()) {
  const prefs = await getPreferences();
  const days = [];
  for (let i = LOOKBACK_DAYS - 1; i >= 0; i--) {
    const d = new Date(date);
    d.setDate(d.getDate() - i);
    const stats = await dayStats(prefs, d);
    days.push({ ...stats, status: statusOf(stats, i === 0) });
  }
  const { current, best, freezes } = walk(days);
  const todayIdx = days.length - 1;

  // This calendar week, Monday to Sunday, for the flame row.
  const mondayOffset = (date.getDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, i) => {
    const offset = i - mondayOffset;
    if (offset > 0) {
      const d = new Date(date);
      d.setDate(d.getDate() + offset);
      return { key: todayKey(d), date: d, status: "future" };
    }
    const day = days[todayIdx + offset];
    return { key: day.key, date: day.date, status: day.status, isToday: offset === 0 };
  });

  // Most recent freeze used in the last 3 days, for the "a freeze saved your streak" note.
  const recentFreeze = days.slice(-4, -1).reverse().find((d) => d.status === "frozen") ?? null;
  const frozenKeys = days.filter((d) => d.status === "frozen").map((d) => d.key);
  const nextFreezeIn = freezes < MAX_FREEZES ? FREEZE_EVERY - (current % FREEZE_EVERY) : null;

  const result = { current, best, week, today: days[todayIdx], freezes, nextFreezeIn, recentFreeze, frozenKeys };
  reportStreak(result, prefs);
  return result;
}

// Status of every day in one calendar month (future days are "future"), for the streak calendar.
// Pass frozenKeys from loadStreak so days saved by a freeze show as frozen.
export async function monthStatuses(year, month, frozenKeys = []) {
  const prefs = await getPreferences();
  const frozen = new Set(frozenKeys);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = new Date(year, month + 1, 0).getDate();
  const out = [];
  for (let day = 1; day <= count; day++) {
    const d = new Date(year, month, day);
    if (d > today) {
      out.push({ key: todayKey(d), date: d, status: "future" });
      continue;
    }
    const stats = await dayStats(prefs, d);
    let status = statusOf(stats, d.getTime() === today.getTime());
    if (status === "missed" && frozen.has(stats.key)) status = "frozen";
    out.push({ key: stats.key, date: d, status, isToday: d.getTime() === today.getTime() });
  }
  return out;
}
