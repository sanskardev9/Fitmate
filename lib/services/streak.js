import { getPreferences } from "./preferencesService";
import { dayStats } from "./insights";
import { todayKey } from "@/lib/utils";

const LOOKBACK_DAYS = 60;

// A day keeps the streak when you followed it: 70%+ of the plan, or a finished workout with at
// least half its sets logged (ending after one set doesn't count).
// Days with nothing planned (rest days, before you had a plan) neither count nor break it.
// Today never breaks the streak while it is still today.
function statusOf(stats, isToday) {
  const finished = Boolean(stats.mainSession?.finishedAt) && stats.plannedSets > 0 && stats.doneSets / stats.plannedSets >= 0.5;
  if ((stats.pct != null && stats.pct >= 70) || finished) return "done";
  if (stats.pct == null) return "rest";
  return isToday ? "pending" : "missed";
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

  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const s = days[i].status;
    if (s === "done") current++;
    else if (s === "missed") break;
  }
  let best = 0;
  let run = 0;
  for (const d of days) {
    if (d.status === "done") best = Math.max(best, ++run);
    else if (d.status === "missed") run = 0;
  }

  // This calendar week, Monday to Sunday, for the flame row.
  const todayIdx = days.length - 1;
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

  return { current, best, week, today: days[todayIdx] };
}

// Status of every day in one calendar month (future days are "future"), for the streak calendar.
export async function monthStatuses(year, month) {
  const prefs = await getPreferences();
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
    out.push({ key: stats.key, date: d, status: statusOf(stats, d.getTime() === today.getTime()), isToday: d.getTime() === today.getTime() });
  }
  return out;
}
