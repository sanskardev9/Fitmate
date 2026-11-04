"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/dexie";
import { loadStreak } from "@/lib/services/streak";

// Keeps the server's streak summary fresh from any page (finishing a workout, logging a meal,
// changing plans), so reminders never nag about a day you've already done.
export default function StreakReporter() {
  const signal = useLiveQuery(
    () => Promise.all([db.workoutSessions.count(), db.sessionSets.count(), db.mealLogs.count(), db.workoutPlans.count(), db.dietPlans.count(), db.preferences.where("key").anyOf("activeWorkoutPlanId", "activeDietPlanId", `mealSwaps_${new Date().toLocaleDateString("en-CA")}`).toArray()]).then((x) => JSON.stringify(x)),
    [],
  );
  useEffect(() => {
    if (signal === undefined) return;
    const t = setTimeout(() => loadStreak().catch(() => {}), 4000);
    return () => clearTimeout(t);
  }, [signal]);
  return null;
}
