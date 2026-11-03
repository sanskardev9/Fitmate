import { supabase } from "@/lib/supabase/client";
import { EXERCISES } from "@/lib/data/exercises";
import { tidyExerciseName } from "@/lib/data/tidyName";

// Shared exercise names from all users (Supabase). Read once per app load; falls back to the
// built-in list when offline.
let cached = null;

export async function loadCatalog() {
  if (cached) return cached;
  if (!supabase) return [];
  const { data, error } = await supabase.from("exercise_catalog").select("name, type").order("uses", { ascending: false }).limit(2000);
  if (error) return [];
  cached = data;
  return data;
}

const builtIn = new Set(EXERCISES.map((e) => e.name.toLowerCase()));

// After a plan is saved: send the exercise names we don't ship with, so others can find them.
// Fire-and-forget; a failure never blocks saving.
export async function contributeExercises(exercises) {
  try {
    if (!supabase) return;
    const fresh = exercises.filter((e) => e.name && !builtIn.has(tidyExerciseName(e.name).toLowerCase()));
    if (!fresh.length) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ exercises: fresh.map((e) => ({ name: e.name, type: e.type })) }),
    });
    cached = null;
  } catch {}
}
