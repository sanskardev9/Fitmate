import { supabase } from "@/lib/supabase/client";
import { getDayForWeekday, getExercisesForDay } from "./workoutService";
import { inferSections, isMain } from "@/lib/workout/sections";
import { getMealsForWeekday, getMealLogsForDate } from "./dietService";

// Sends a small streak summary to the profile so the server can send "save your streak"
// reminders at the right local time. Only sends when something changed; never blocks the UI.
const KEY = "fitmate:streakReport";
let timer = null;

async function planWeek(prefs) {
  const week = {};
  for (let wd = 0; wd < 7; wd++) {
    const [day, meals] = await Promise.all([getDayForWeekday(prefs.activeWorkoutPlanId, wd), getMealsForWeekday(prefs.activeDietPlanId, wd)]);
    if (!day && !meals.length) continue;
    // What the reminder can say about the workout: how many exercises, the first one, rough length.
    const main = day ? inferSections(await getExercisesForDay(day.id)).filter(isMain) : [];
    const sets = main.reduce((n, e) => n + (e.sets ?? 0), 0);
    const restSec = main.reduce((n, e) => n + (e.sets ?? 0) * (e.restSec ?? 90), 0);
    week[wd] = {
      workout: day?.name ?? null,
      exercises: main.length,
      first: main[0]?.name ?? null,
      minutes: sets ? Math.round((sets * 45 + restSec) / 60 / 5) * 5 || 5 : null,
      meals: meals.length,
      firstMeal: meals[0] ? { name: meals[0].name, slot: meals[0].slot ?? null } : null,
      // One per slot, for meal reminders: dish name + the plan's own time if it has one.
      slots: Object.values(
        meals.reduce((m, x) => {
          const slot = x.slot || "Meal";
          m[slot] ??= { slot, name: x.name, time: x.timing || null };
          return m;
        }, {}),
      ).slice(0, 6),
    };
  }
  return week;
}

// Which of today's meal slots are logged, so meal reminders skip them.
async function todayLog(prefs, day) {
  const [meals, logs] = await Promise.all([getMealsForWeekday(prefs.activeDietPlanId, new Date().getDay()), getMealLogsForDate(day)]);
  const slotOf = Object.fromEntries(meals.map((m) => [m.id, m.slot || "Meal"]));
  return { day, slots: [...new Set(logs.map((l) => slotOf[l.mealId]).filter(Boolean))] };
}

export function reportStreak(streak, prefs) {
  if (typeof window === "undefined" || !supabase) return;
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      const fields = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        streak_current: streak.current,
        streak_freezes: streak.freezes,
        streak_day: streak.today.key,
        streak_today: streak.today.status === "missed" ? "pending" : streak.today.status,
        plan_week: await planWeek(prefs),
        today_log: await todayLog(prefs, streak.today.key),
      };
      const sig = JSON.stringify([userId, fields]);
      if (localStorage.getItem(KEY) === sig) return;
      const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
      if (!error) localStorage.setItem(KEY, sig);
    } catch {
      // Offline: the next streak load tries again.
    }
  }, 1500);
}
