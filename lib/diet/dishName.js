// Dish names are just the dish. Older plans put timing in the name ("Post-workout Paneer
// Curry", "Rest Day Soya Pulao"); strip it for display and expose it as a separate label.
const TIMING = /^\s*(pre[\s-]*workout|post[\s-]*workout|rest[\s-]*day|training[\s-]*day|workout[\s-]*day)\s*[-:–|]?\s*/i;

export function dishName(name) {
  let n = String(name ?? "");
  for (let i = 0; i < 2 && TIMING.test(n); i++) n = n.replace(TIMING, "");
  return n.trim() || String(name ?? "");
}

export function mealTiming(meal) {
  const t = String(meal?.timing ?? "").toLowerCase();
  if (t.includes("pre")) return "Pre-workout";
  if (t.includes("post")) return "Post-workout";
  const m = String(meal?.name ?? "").match(/\b(pre|post)[\s-]*workout\b/i);
  return m ? (m[1].toLowerCase() === "pre" ? "Pre-workout" : "Post-workout") : null;
}
