// Common foods with approximate macros per listed serving. Users can edit any value.
const f = (name, serving, calories, proteinG, carbsG, fatG) => ({ name, serving, calories, proteinG, carbsG, fatG });

export const FOODS = [
  f("Eggs (3 whole)", "3 large", 215, 19, 1, 15),
  f("Egg whites (4)", "4 large", 68, 14, 1, 0),
  f("Chicken breast", "150 g cooked", 248, 46, 0, 5),
  f("Paneer", "100 g", 265, 18, 4, 20),
  f("Tofu", "150 g", 120, 13, 3, 7),
  f("Whey protein shake", "1 scoop (30 g)", 120, 24, 3, 2),
  f("Greek yogurt", "200 g", 146, 20, 8, 4),
  f("Curd / Dahi", "200 g", 120, 7, 9, 6),
  f("Milk", "250 ml", 155, 8, 12, 8),
  f("Dal (cooked)", "1 bowl (200 g)", 230, 14, 34, 4),
  f("Rajma (cooked)", "1 bowl (200 g)", 250, 15, 40, 3),
  f("Chole (cooked)", "1 bowl (200 g)", 270, 14, 45, 5),
  f("Soya chunks", "50 g dry", 172, 26, 16, 0),
  f("Fish (grilled)", "150 g", 200, 34, 0, 6),
  f("Mutton curry", "1 bowl (200 g)", 380, 30, 6, 26),
  f("Roti / Chapati (2)", "2 medium", 240, 8, 46, 3),
  f("White rice", "1 cup cooked", 205, 4, 45, 0),
  f("Brown rice", "1 cup cooked", 215, 5, 45, 2),
  f("Oats", "50 g dry", 190, 7, 33, 3),
  f("Poha", "1 plate", 250, 5, 45, 6),
  f("Upma", "1 plate", 250, 6, 40, 7),
  f("Idli (3) with sambar", "1 plate", 260, 9, 50, 3),
  f("Dosa with sambar", "1 plate", 330, 8, 52, 10),
  f("Bread (2 slices)", "2 slices", 160, 6, 30, 2),
  f("Peanut butter", "2 tbsp", 190, 8, 6, 16),
  f("Banana", "1 medium", 105, 1, 27, 0),
  f("Apple", "1 medium", 95, 0, 25, 0),
  f("Almonds", "30 g", 174, 6, 6, 15),
  f("Mixed vegetables (sabzi)", "1 bowl", 150, 4, 15, 8),
  f("Salad", "1 bowl", 60, 2, 10, 1),
  f("Sweet potato", "200 g", 172, 3, 40, 0),
  f("Potato (boiled)", "200 g", 154, 4, 35, 0),
  f("Peanuts (roasted)", "30 g", 170, 8, 5, 15),
  f("Ghee", "1 tbsp (14 g)", 124, 0, 0, 14),
  f("Oil (any cooking oil)", "1 tbsp (14 g)", 120, 0, 0, 14),
  f("Butter", "10 g", 72, 0, 0, 8),
  f("Full-fat curd", "200 g", 122, 7, 9, 7),
  f("Cheese slice", "1 slice (20 g)", 62, 4, 1, 5),
  f("Cashews", "30 g", 166, 5, 9, 13),
  f("Walnuts", "30 g", 196, 5, 4, 20),
  f("Chia seeds", "15 g", 73, 3, 6, 5),
  f("Flax seeds", "15 g", 80, 3, 4, 6),
  f("Pumpkin seeds", "30 g", 170, 9, 3, 15),
  f("Coconut (fresh, grated)", "30 g", 106, 1, 5, 10),
];

// Grams (or ml) in a serving text: "30 g", "1 tbsp (14 g)", "250 ml" -> number, else null.
export function gramsIn(text) {
  const m = String(text ?? "").match(/(\d+(?:\.\d+)?)\s*(g|gm|grams?|ml)\b/i);
  return m ? Number(m[1]) : null;
}

// The food whose name best matches what was typed ("peanut" -> Peanuts (roasted)).
export function findFood(name) {
  const q = String(name ?? "").trim().toLowerCase().replace(/s$/, "");
  if (q.length < 3) return null;
  return FOODS.find((x) => x.name.toLowerCase().startsWith(q)) ?? FOODS.find((x) => x.name.toLowerCase().includes(q)) ?? null;
}

// Values for an amount: the food's serving scaled by grams when both are in grams.
export function scaleFood(food, servingText) {
  const base = gramsIn(food.serving);
  const want = gramsIn(servingText);
  const k = base && want ? want / base : 1;
  const r = (v) => Math.round((v ?? 0) * k);
  return { calories: r(food.calories), proteinG: r(food.proteinG), carbsG: r(food.carbsG), fatG: r(food.fatG) };
}
