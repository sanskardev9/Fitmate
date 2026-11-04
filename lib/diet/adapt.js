// The diet follows your body: every couple of weeks, compare your weight trend with your goal and,
// if it's off, suggest a small calorie change (±150 kcal). Protein never changes; carbs and fat
// are re-split from the new calories (fat ~25%).

// Healthy weekly change (kg / week) for each goal.
export const RANGE = {
  lose_fat: [-0.9, -0.25],
  recomposition: [-0.4, 0.1],
  build_muscle: [0.1, 0.4],
  gain_strength: [-0.1, 0.3],
  calisthenics_skills: [-0.25, 0.2],
  maintain: [-0.2, 0.2],
  general_fitness: [-0.3, 0.2],
};
const STEP = 150;
const COOLDOWN_DAYS = 14;
const DAY = 86400000;

// kg per week from weigh-ins in the last 3 weeks (straight-line fit). Needs 3+ weigh-ins over 10+ days.
export function weeklyRate(weights, now = Date.now()) {
  const pts = weights
    .map((w) => ({ t: new Date(`${w.date}T12:00:00`).getTime(), kg: Number(w.weightKg) }))
    .filter((p) => p.kg > 0 && now - p.t <= 21 * DAY)
    .sort((a, b) => a.t - b.t);
  if (pts.length < 3 || (pts.at(-1).t - pts[0].t) / DAY < 10) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.t, 0) / n;
  const my = pts.reduce((s, p) => s + p.kg, 0) / n;
  const num = pts.reduce((s, p) => s + (p.t - mx) * (p.kg - my), 0);
  const den = pts.reduce((s, p) => s + (p.t - mx) ** 2, 0);
  return den ? Math.round((num / den) * 7 * DAY * 100) / 100 : null;
}

export function splitMacros(calories, proteinG) {
  const fatG = Math.round((calories * 0.25) / 9);
  return { fatG, carbsG: Math.max(0, Math.round((calories - (Number(proteinG) || 0) * 4 - fatG * 9) / 4)) };
}

// Advice, or null when on track / too early / too little data.
export function calorieAdvice({ goal, weights, calories, proteinG, lastAdjustAt, snoozedAt, now = Date.now() }) {
  const range = RANGE[goal] ?? RANGE.general_fitness;
  if (!calories) return null;
  if (lastAdjustAt && now - lastAdjustAt < COOLDOWN_DAYS * DAY) return null;
  if (snoozedAt && now - snoozedAt < 7 * DAY) return null;
  const rate = weeklyRate(weights, now);
  if (rate == null) return null;
  const [lo, hi] = range;
  if (rate >= lo && rate <= hi) return null;
  const change = rate > hi ? -STEP : STEP;
  const newCalories = Math.max(1200, calories + change);
  const dir = (r) => (Math.abs(r) < 0.05 ? "steady" : r > 0 ? `up ${r.toFixed(2)} kg a week` : `down ${Math.abs(r).toFixed(2)} kg a week`);
  const want = hi <= 0 ? `losing ${Math.abs(hi).toFixed(2)}–${Math.abs(lo).toFixed(2)} kg a week` : lo >= 0 ? `gaining ${lo.toFixed(1)}–${hi.toFixed(1)} kg a week` : `between losing ${Math.abs(lo).toFixed(2)} and gaining ${hi.toFixed(2)} kg a week`;
  return { rate, change, newCalories, ...splitMacros(newCalories, proteinG), reason: `Your weight is ${dir(rate)}. For your goal, aim for ${want}.` };
}

// Easy cuts from today's meals when they're over the calorie target.
export const CUTS = [
  [/\broti|chapati|atta/, "1 roti less", 120],
  [/\brice\b/, "½ cup less rice", 100],
  [/\boil\b|\bghee\b/, "1 tsp less oil or ghee", 45],
  [/peanut/, "10 g fewer peanuts", 57],
  [/\bpoha\b|\boats?\b/, "20 g less poha or oats", 75],
  [/\bbread\b/, "1 slice less bread", 80],
  [/paneer/, "25 g less paneer", 66],
];
