import { supabase } from "@/lib/supabase/client";
import { db } from "@/lib/db/dexie";

// Shared dishes from other people's diet plans, offered as swaps only when they truly fit:
// same slot, close nutrition, allowed diet type, and nothing the user avoids.

// After saving a diet plan: share its tagged dishes (meals + alternatives). Never blocks saving.
export async function contributeDishes(days) {
  try {
    if (!supabase) return;
    const dishes = days.flatMap((d) => d.meals.flatMap((m) => [m, ...(m.alternatives ?? [])].map((x) => ({ ...x, slot: m.slot }))));
    const tagged = dishes.filter((x) => x.category && x.diet);
    if (!tagged.length) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dishes: tagged.map(({ name, slot, category, diet, calories, proteinG, carbsG, fatG, serving, recipe }) => ({ name, slot, category, diet, calories, proteinG, carbsG, fatG, serving, recipe })) }),
    });
  } catch {}
}

// Which diet types this user may see, from their own plan's tags. null = unknown -> show none.
export async function allowedDiets(planId) {
  if (!planId) return null;
  const meals = await db.meals.where("planId").equals(planId).toArray();
  const tags = new Set(meals.flatMap((m) => [m.diet, ...(m.alternatives ?? []).map((a) => a.diet)]).filter(Boolean));
  if (!tags.size) return null;
  if (tags.has("nonveg")) return ["veg", "egg", "nonveg", "vegan"];
  if (tags.has("egg")) return ["veg", "egg", "vegan"];
  if ([...tags].every((t) => t === "vegan")) return ["vegan"];
  return ["veg", "vegan"];
}

// Words that mean a dish contains something the user avoids (from their Create-with-AI answers).
const AVOID_WORDS = {
  Dairy: /milk|curd|dahi|paneer|cheese|ghee|butter|yogh?urt|raita|cream|lassi|khoa|whey/i,
  Eggs: /\begg|omelet/i,
  Nuts: /peanut|almond|cashew|walnut|pistachio|\bnuts?\b|kaju|badam/i,
  Gluten: /wheat|atta|roti|chapati|bread|toast|paratha|maida|dalia|semolina|suji|rava|pasta|noodle|naan|kulcha|sandwich/i,
  Soy: /soy|soya|tofu/i,
  Seafood: /fish|prawn|shrimp|crab|tuna|salmon/i,
};

export async function avoidRegexes() {
  const row = await db.preferences.get("aiAnswers_diet");
  const skip = row?.value?.skip ?? [];
  const out = skip.map((k) => AVOID_WORDS[k]).filter(Boolean);
  if (row?.value?.whey?.[0] !== "I have it") out.push(/whey|protein powder|protein shake|scoop/i);
  return out;
}

// Close-nutrition matches for a meal: same slot, calories ±10%, protein ±15% (min ±4 g).
export async function similarDishes(meal, diets, avoid = []) {
  if (!supabase || !diets?.length) return [];
  const cal = Number(meal.calories) || 0;
  const pro = Number(meal.proteinG) || 0;
  if (!cal) return [];
  const pTol = Math.max(4, pro * 0.15);
  const { data, error } = await supabase
    .from("dish_catalog")
    .select("name, slot, category, diet, calories, protein_g, carbs_g, fat_g, serving, recipe")
    .eq("slot", meal.slot)
    .in("diet", diets)
    .gte("calories", Math.round(cal * 0.9))
    .lte("calories", Math.round(cal * 1.1))
    .gte("protein_g", Math.max(0, pro - pTol))
    .lte("protein_g", pro + pTol)
    .order("uses", { ascending: false })
    .limit(80);
  if (error || !data) return [];
  return data
    .map((d) => ({ name: d.name, category: d.category, diet: d.diet, calories: d.calories, proteinG: Number(d.protein_g), carbsG: d.carbs_g == null ? null : Number(d.carbs_g), fatG: d.fat_g == null ? null : Number(d.fat_g), serving: d.serving ?? "", recipe: d.recipe ?? "" }))
    .filter((d) => !avoid.some((re) => re.test(`${d.name} ${d.recipe}`)));
}
