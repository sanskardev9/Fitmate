"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/dexie";
import { getPreferences } from "@/lib/services/preferencesService";
import { getDayForWeekday, getExercisesForDay } from "@/lib/services/workoutService";
import { getMealsForWeekday, getMealLogsForDate, sumNutrition } from "@/lib/services/dietService";
import { todayKey, WEEKDAYS } from "@/lib/utils";
import Card from "@/components/common/Card";
import PageHeader from "@/components/common/PageHeader";
import Welcome from "./Welcome";

async function loadToday() {
  const date = new Date();
  const weekday = date.getDay();
  const key = todayKey(date);
  const prefs = await getPreferences();

  const day = await getDayForWeekday(prefs.activeWorkoutPlanId, weekday);
  const exercises = day ? await getExercisesForDay(day.id) : [];
  const sessions = day ? await db.workoutSessions.where("dayId").equals(day.id).toArray() : [];
  const doneToday = sessions.some((s) => s.finishedAt && todayKey(new Date(s.finishedAt)) === key);

  let nextDay = null;
  if (!day && prefs.activeWorkoutPlanId) {
    for (let i = 1; i <= 7 && !nextDay; i++) {
      const d = await getDayForWeekday(prefs.activeWorkoutPlanId, (weekday + i) % 7);
      if (d) nextDay = { ...d, weekdayLabel: WEEKDAYS[(weekday + i) % 7] };
    }
  }

  const meals = await getMealsForWeekday(prefs.activeDietPlanId, weekday);
  const logs = await getMealLogsForDate(key);
  const loggedMealIds = new Set(logs.map((l) => l.mealId));
  const totals = sumNutrition(logs);

  const latestWeight = await db.bodyMetrics.orderBy("date").last();

  return { prefs, day, exercises, doneToday, nextDay, meals, loggedMealIds, totals, latestWeight };
}

export default function Dashboard() {
  const data = useLiveQuery(loadToday, []);
  const date = new Date();

  if (!data) return <PageHeader title="Today" subtitle={date.toDateString()} />;

  const { prefs, day, exercises, doneToday, nextDay, meals, loggedMealIds, totals, latestWeight } = data;
  if (!prefs.activeWorkoutPlanId && !prefs.activeDietPlanId) return <Welcome />;

  // Calculated target if set, otherwise what today's diet plan adds up to.
  const proteinGoal = prefs.proteinTargetG ?? sumNutrition(meals).proteinG;
  const proteinPct = proteinGoal ? Math.min(100, Math.round((totals.proteinG / proteinGoal) * 100)) : 0;
  const mealsDone = meals.filter((m) => loggedMealIds.has(m.id)).length;

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        action={
          <Link href="/home" className="text-sm font-medium text-emerald-600">
            Daily tracker →
          </Link>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Workout">
          {!prefs.activeWorkoutPlanId ? (
            <EmptyState text="No active workout plan." href="/plans/workout/new" cta="Create workout" />
          ) : day ? (
            <>
              <div className="flex items-baseline justify-between">
                <p className="text-lg font-semibold">{day.name}</p>
                <span className={`text-sm ${doneToday ? "text-emerald-600" : "text-neutral-500"}`}>
                  {doneToday ? "Completed" : `${exercises.length} exercises`}
                </span>
              </div>
              {!doneToday && (
                <Link
                  href={`/session?day=${day.id}`}
                  className="mt-3 block rounded-xl bg-emerald-600 py-3 text-center text-base font-semibold text-white active:bg-emerald-700"
                >
                  Start workout
                </Link>
              )}
            </>
          ) : (
            <p className="text-neutral-600 dark:text-neutral-400">
              Rest day.{nextDay && ` Next: ${nextDay.name} on ${nextDay.weekdayLabel}.`}
            </p>
          )}
        </Card>

        <Card title="Protein">
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-semibold">
              {Math.round(totals.proteinG)} <span className="text-sm font-normal text-neutral-500">/ {proteinGoal ? Math.round(proteinGoal) : "–"} g</span>
            </p>
            <span className="text-sm text-neutral-500">{Math.round(totals.calories)} kcal</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${proteinPct}%` }} />
          </div>
        </Card>

        <Card title={`Meals${meals.length ? ` · ${mealsDone}/${meals.length}` : ""}`}>
          {!prefs.activeDietPlanId ? (
            <EmptyState text="No active diet plan." href="/plans/diet/new" cta="Create diet plan" />
          ) : meals.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-400">No meals planned today.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {meals.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2">
                  <span className={loggedMealIds.has(m.id) ? "text-neutral-400 line-through" : ""}>{m.name}</span>
                  <span className="text-sm text-neutral-500">{m.proteinG ?? "–"} g</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {latestWeight && (
          <Card title="Bodyweight">
            <p className="text-lg font-semibold">
              {latestWeight.weightKg} kg <span className="text-sm font-normal text-neutral-500">on {latestWeight.date}</span>
            </p>
          </Card>
        )}
      </div>
    </>
  );
}

function EmptyState({ text, href, cta }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-neutral-600 dark:text-neutral-400">{text}</p>
      <Link href={href} className="text-sm font-medium text-emerald-600">
        {cta}
      </Link>
    </div>
  );
}
