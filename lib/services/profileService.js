import { supabase } from "@/lib/supabase/client";
import { setPreference } from "./preferencesService";

// Profiles live in Supabase (public.profiles, RLS: own row only). A copy is cached in
// localStorage so the app can open offline and the login gate doesn't wait on the network.
const cacheKey = (userId) => `fitmate:profile:${userId}`;

export function cachedProfile(userId) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)) ?? "null");
  } catch {
    return null;
  }
}

function cache(profile) {
  try {
    localStorage.setItem(cacheKey(profile.id), JSON.stringify(profile));
  } catch {}
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data) cache(data);
  return data;
}

// Upserts the signed-in user's profile and mirrors nutrition goals into local preferences,
// which the tracker and dashboard read.
export async function saveProfile(userId, fields) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...fields }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  cache(data);
  if (data.protein_target_g != null) await setPreference("proteinTargetG", data.protein_target_g);
  if (data.calories_target != null) await setPreference("caloriesTarget", data.calories_target);
  return data;
}

const PROTEIN_PER_KG = { lose_fat: 2.0, recomposition: 2.0, build_muscle: 1.8, gain_strength: 1.8, calisthenics_skills: 1.6, maintain: 1.6, general_fitness: 1.4 };
// Daily kcal relative to maintenance. Recomposition (gain muscle while losing fat) uses a small deficit.
const GOAL_ADJUST = { lose_fat: -450, recomposition: -250, build_muscle: 250, gain_strength: 150 };

const KCAL_PER_KG = 7700;

// Suggested daily targets from bodyweight, goal, target weight and Mifflin-St Jeor BMR.
// A target weight sets the direction (lose ~0.45 kg/week at -500, gain ~0.2 kg/week at +250);
// recomposition always uses a small deficit. Returns the working so the UI can explain it.
export function suggestTargets({ weight_kg, target_weight_kg, height_cm, gender, date_of_birth, goal, training_days_per_week }) {
  const w = Number(weight_kg);
  if (!w) return {};
  const target = Number(target_weight_kg) || null;
  // Protein from the lighter of current/target weight, so it isn't inflated by excess fat.
  const proteinBase = target && target < w ? target : w;
  const protein = Math.round((proteinBase * (PROTEIN_PER_KG[goal] ?? 1.6)) / 5) * 5;

  const h = Number(height_cm);
  const age = date_of_birth ? Math.floor((Date.now() - new Date(date_of_birth)) / 31_557_600_000) : null;
  if (!h || !age || !["male", "female"].includes(gender)) return { protein_target_g: protein };

  const bmr = 10 * w + 6.25 * h - 5 * age + (gender === "male" ? 5 : -161);
  const activity = 1.2 + Math.min(Number(training_days_per_week) || 3, 7) * 0.05;
  const maintenance = Math.round((bmr * activity) / 50) * 50;

  let adjust = GOAL_ADJUST[goal] ?? 0;
  let direction = null;
  const delta = target ? target - w : 0;
  if (goal !== "recomposition" && Math.abs(delta) >= 0.5) {
    direction = delta < 0 ? "lose" : "gain";
    adjust = delta < 0 ? -Math.min(500, Math.round(maintenance * 0.25 / 50) * 50) : 250;
  }
  const weeks = direction ? Math.round((Math.abs(delta) * KCAL_PER_KG) / (Math.abs(adjust) * 7)) : null;
  return { protein_target_g: protein, calories_target: maintenance + adjust, maintenance, adjust, direction, weeks };
}

export function clearProfileCache(userId) {
  try {
    localStorage.removeItem(cacheKey(userId));
  } catch {}
}
