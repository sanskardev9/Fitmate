// Dish categories for grouping swap options. Taken only from the plan's JSON ("category"),
// never guessed from names, so grouping is exactly what the plan says.
export const DISH_CATEGORIES = ["Oats", "Chilla & dosa", "Sandwich & toast", "Poha & upma", "Paratha & roti", "Rice", "Dal & curry", "Shake & smoothie", "Curd & yogurt", "Salad", "Paneer & tofu", "Eggs", "Chicken & fish", "Other"];

const byLower = Object.fromEntries(DISH_CATEGORIES.map((c) => [c.toLowerCase(), c]));

// Returns the plan's category (normalised to the fixed list's spelling when it matches), or null.
export function categoryOf(dish) {
  const raw = String(dish?.category ?? "").trim();
  if (!raw) return null;
  return byLower[raw.toLowerCase()] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}
