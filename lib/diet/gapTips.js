import { FOODS, gramsIn, scaleFood } from "@/lib/data/foods";
import { ingredientsOf } from "@/lib/diet/groceries";

// "What should I eat to close today's gap?" After today's planned meals (eaten + still to eat),
// find the biggest real gap (calories, protein, carbs or fat) and suggest a few foods sized to it.
// Foods from today's own meals come first (they're in the kitchen already); FitMate's food list
// fills in. Nothing is suggested when everything is within ~10% of its target.

const FOCUS = {
  calories: { key: "calories", unit: "kcal", min: 150, foods: ["Banana", "Peanuts (roasted)", "Oats", "Milk", "Roti / Chapati (2)"] },
  proteinG: { key: "proteinG", unit: "g", min: 8, foods: ["Soya chunks", "Curd / Dahi", "Greek yogurt", "Paneer", "Tofu", "Whey protein shake", "Eggs (3 whole)", "Chicken breast"] },
  carbsG: { key: "carbsG", unit: "g", min: 20, foods: ["Banana", "Oats", "Roti / Chapati (2)", "White rice", "Poha"] },
  fatG: { key: "fatG", unit: "g", min: 5, foods: ["Peanuts (roasted)", "Ghee", "Almonds", "Full-fat curd", "Walnuts", "Oil (any cooking oil)"] },
};

// Ingredient words in a recipe -> foods in the list.
const MATCH = [
  [/peanut/, "Peanuts (roasted)"],
  [/\bghee\b/, "Ghee"],
  [/\boil\b/, "Oil (any cooking oil)"],
  [/almond/, "Almonds"],
  [/walnut/, "Walnuts"],
  [/full[- ]fat curd/, "Full-fat curd"],
  [/curd|dahi/, "Curd / Dahi"],
  [/greek yog/, "Greek yogurt"],
  [/soya|soy chunk/, "Soya chunks"],
  [/paneer/, "Paneer"],
  [/tofu/, "Tofu"],
  [/whey/, "Whey protein shake"],
  [/\boats?\b/, "Oats"],
  [/banana/, "Banana"],
  [/\bmilk\b/, "Milk"],
  [/\broti|atta|chapati/, "Roti / Chapati (2)"],
  [/\brice\b/, "White rice"],
  [/\bpoha\b/, "Poha"],
  [/\beggs?\b/, "Eggs (3 whole)"],
  [/chicken/, "Chicken breast"],
];
const NON_VEG = new Set(["Eggs (3 whole)", "Egg whites (4)", "Chicken breast", "Fish (grilled)", "Mutton curry"]);
const EGG = new Set(["Eggs (3 whole)", "Egg whites (4)"]);

// Sensible limits per food (grams), so a suggestion is never silly (no 200 g of ghee).
const LIMITS = { Ghee: [5, 14], "Oil (any cooking oil)": [5, 14], "Peanuts (roasted)": [10, 40], Almonds: [10, 40], Walnuts: [10, 30], "Soya chunks": [20, 60], Paneer: [50, 150], Tofu: [75, 200], "Curd / Dahi": [100, 300], "Full-fat curd": [100, 300], "Greek yogurt": [100, 300], Oats: [30, 80] };

const nice = (g) => (g < 50 ? Math.round(g / 5) * 5 : Math.round(g / 10) * 10);

function sized(food, need, focusKey) {
  const per = scaleFood(food, food.serving)[focusKey] || 0;
  if (!per) return null;
  const base = gramsIn(food.serving);
  if (!base) {
    // Counted servings ("1 medium", "2 slices"): one serving.
    return { serving: food.serving, ...scaleFood(food, food.serving) };
  }
  const [lo, hi] = LIMITS[food.name] ?? [base * 0.5, base * 2];
  const g = Math.min(hi, Math.max(lo, nice((base * need) / per)));
  // Fats are measured with a spoon: 1 tsp (5 g) or 1 tbsp (14 g).
  const spoon = /^(Ghee|Oil)/.test(food.name) ? (g >= 10 ? "1 tbsp" : "1 tsp") : null;
  const grams = spoon === "1 tbsp" ? 14 : spoon === "1 tsp" ? 5 : g;
  return { serving: spoon ?? `${g} g`, ...scaleFood(food, `${grams} g`) };
}

export function gapSuggestions({ targets, eaten, meals = [], logs = [], swaps = {} }) {
  // What today will add up to if the rest of the plan is eaten.
  const loggedIds = new Set(logs.map((l) => l.mealId));
  const expected = { ...eaten };
  for (const m of meals) {
    if (loggedIds.has(m.id)) continue;
    const c = swaps?.[m.id]?.name ? swaps[m.id] : m;
    for (const k of ["calories", "proteinG", "carbsG", "fatG"]) expected[k] = (expected[k] || 0) + (Number(c[k]) || 0);
  }
  // The biggest gap, relative to its target, that's worth acting on.
  let best = null;
  for (const f of Object.values(FOCUS)) {
    const goal = Number(targets?.[f.key]) || 0;
    if (!goal) continue;
    const gap = goal - (expected[f.key] || 0);
    if (gap < f.min || gap < goal * 0.1) continue;
    const rel = gap / goal;
    if (!best || rel > best.rel) best = { ...f, gap: Math.round(gap), rel };
  }
  if (!best) return null;

  // Diet type from today's meals: veg (no eggs or meat), egg (no meat), or anything.
  const diets = meals.map((m) => String(m.diet || "").toLowerCase());
  const allowNonVeg = diets.includes("nonveg");
  const allowEgg = allowNonVeg || diets.includes("egg");
  const allowed = (name) => (!NON_VEG.has(name) || (EGG.has(name) ? allowEgg : allowNonVeg));

  // Foods already in today's meals, then the list.
  const inPlan = new Set();
  for (const m of meals) {
    const c = swaps?.[m.id]?.name ? swaps[m.id] : m;
    for (const ing of ingredientsOf(c.recipe)) {
      const hit = MATCH.find(([re]) => re.test(ing.name.toLowerCase()));
      if (hit) inPlan.add(hit[1]);
    }
  }
  const caloriesLeft = (Number(targets?.calories) || 0) - (expected.calories || 0);
  const order = [...best.foods.filter((n) => inPlan.has(n)), ...best.foods.filter((n) => !inPlan.has(n))];
  const items = [];
  for (const name of order) {
    if (!allowed(name)) continue;
    if (name.startsWith("Oil") && items.some((x) => x.name === "Ghee")) continue; // one cooking fat is enough
    const food = FOODS.find((x) => x.name === name);
    if (!food) continue;
    const s = sized(food, best.gap, best.key);
    if (!s) continue;
    // Already at your calories: skip calorie-heavy fixes for protein / carbs / fat.
    if (best.key !== "calories" && caloriesLeft < 100 && s.calories > 220) continue;
    items.push({ name: food.name.split(" (")[0].replace(" / Dahi", ""), ...s, fromPlan: inPlan.has(name) });
    if (items.length === 3) break;
  }
  return items.length ? { focus: best.key, unit: best.unit, gap: best.gap, items } : null;
}
