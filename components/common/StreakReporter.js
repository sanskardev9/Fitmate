"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/dexie";
import { loadStreak } from "@/lib/services/streak";
import { supabase } from "@/lib/supabase/client";

// Keeps the server's streak summary fresh from any page (finishing a workout, logging a meal,
// changing plans), so reminders never nag about a day you've already done.
export default function StreakReporter() {
  // Opened from the Home Screen: note it on the account so browsers stop suggesting the install.
  useEffect(() => {
    const installed = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (!installed || !supabase) return;
    try {
      if (localStorage.getItem("fitmate:installedReported")) return;
    } catch {}
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id;
      if (!id) return;
      supabase
        .from("profiles")
        .update({ app_installed_at: new Date().toISOString() })
        .eq("id", id)
        .is("app_installed_at", null)
        .then(({ error }) => {
          if (!error) {
            try {
              localStorage.setItem("fitmate:installedReported", "1");
            } catch {}
          }
        });
    });
  }, []);

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
