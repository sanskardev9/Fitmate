import { EXERCISES, exerciseDefaults } from "@/lib/data/exercises";
import { FOODS } from "@/lib/data/foods";

// Heuristic parsers for plan PDFs. They never invent values silently: anything guessed or missing
// is listed in the item's `flags`, which the builder highlights for review.

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_RE = /\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(day|nesday|rsday|urday)?\b/gi;
const DAY_HEADER_RE = /^(day\s*\d+|week\s*\d+|(sun|mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?)day|push|pull|legs?|upper|lower|full[\s-]?body|rest day|chest|back|shoulders?|arms|core|skill)\b/i;
const MEAL_SLOT_RE = /^(early morning|breakfast|brunch|mid[\s-]?morning|lunch|evening snack|snacks?|pre[\s-]?workout|post[\s-]?workout|dinner|supper|bedtime)\b\s*[:\-–]?\s*/i;

const BULLET_RE = /^\s*(?:[-•*·▪●◦]|\d+[.)]|[a-z][.)])\s+/i;
const num = (s) => (s == null ? null : Number(s));

const WORKOUT_HINTS = /\b(sets?|reps?|x\s*\d|×|hold|rest|planche|lever|pull-?ups?|push-?ups?|squats?|dips?|handstand)\b/i;
const DIET_HINTS = /\b(breakfast|lunch|dinner|snack|kcal|calories|protein|carbs?|grams?|\d+\s*g\b|meal)\b/i;

export function detectKind(lines) {
  let w = 0;
  let d = 0;
  for (const l of lines) {
    if (WORKOUT_HINTS.test(l)) w++;
    if (DIET_HINTS.test(l)) d++;
  }
  return d > w ? "diet" : "workout";
}

function weekdaysIn(line) {
  const found = new Set();
  for (const m of line.matchAll(WEEKDAY_RE)) {
    const i = WEEKDAY_NAMES.findIndex((n) => n.startsWith(m[1].toLowerCase().slice(0, 3)));
    if (i >= 0) found.add(i);
  }
  return [...found].sort();
}

function cleanName(s) {
  return s
    .replace(BULLET_RE, "")
    .replace(/[:\-–—|,]+\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function matchExercise(name) {
  const n = name.toLowerCase().replace(/s\b/g, "");
  return (
    EXERCISES.find((e) => e.name.toLowerCase() === name.toLowerCase()) ??
    EXERCISES.filter((e) => n.includes(e.name.toLowerCase().replace(/s\b/g, ""))).sort((a, b) => b.name.length - a.name.length)[0]
  );
}

// ---------- Workout ----------

const ACRONYMS = new Set(["HSPU", "RDL", "HIIT", "AMRAP", "EMOM", "RPE", "RIR", "BW", "DB", "KB"]);
// ALL-CAPS headings ("MONDAY — LEGS + CORE") become Title Case, keeping known acronyms.
const titleCase = (s) =>
  s === s.toUpperCase()
    ? s.replace(/\p{L}[\p{L}\d]*/gu, (w) => (ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    : s;

export function parseWorkout(lines) {
  const days = [];
  let day = null;
  const startDay = (name, weekdays = []) => {
    day = { name, weekdays, exercises: [] };
    days.push(day);
  };

  for (const raw of lines) {
    const line = raw.trim();
    const ex = parseExerciseLine(line);
    if (ex) {
      if (!day) startDay("Day 1");
      day.exercises.push(ex);
      continue;
    }
    if (DAY_HEADER_RE.test(line) && line.length < 60) {
      startDay(titleCase(cleanName(line)), weekdaysIn(line));
    }
  }
  return days.filter((d) => d.exercises.length);
}

const TIME_RE = /(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*(min|mins|minutes|sec|secs|seconds|s)\b/gi;
const range = (lo, hi) => (hi ? `${lo}–${hi}` : `${lo}`);

function parseExerciseLine(line) {
  let sets = null;
  let reps = null;
  let holdSec = null;
  let type = "reps";
  const flags = [];
  const notes = [];
  let cut = -1;
  let tail = "";

  // "3 × 8", "3x8-10", "4 × 8–15 sec", "6–10 × 10–20 sec", "3 × 3–5 reps"
  let m = line.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*[x×*]\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*(reps?|s|sec|secs|seconds)?\b/i);
  if (m) {
    sets = num(m[1]);
    if (m[2]) notes.push(`${range(m[1], m[2])} sets`);
    if (m[5] && /^s/i.test(m[5])) {
      type = "hold";
      holdSec = num(m[3]);
    } else reps = num(m[3]);
    if (m[4]) notes.push(`Target ${range(m[3], m[4])}${type === "hold" ? " sec" : " reps"}`);
    cut = m.index;
    tail = line.slice(m.index + m[0].length);
  } else if ((m = line.match(/(\d+)\s*sets?\s*(?:of|x|×)?\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*(reps?|s|sec|secs|seconds)?/i))) {
    // "3 sets of 8 reps", "3 sets 20 sec"
    sets = num(m[1]);
    if (m[4] && /^s/i.test(m[4])) {
      type = "hold";
      holdSec = num(m[2]);
    } else reps = num(m[2]);
    if (m[3]) notes.push(`Target ${range(m[2], m[3])}${type === "hold" ? " sec" : " reps"}`);
    cut = m.index;
    tail = line.slice(m.index + m[0].length);
  } else if ((m = line.match(/(\d+)\s*(reps?|s|sec|secs|seconds)\b/i)) && matchExercise(cleanName(line.slice(0, m.index)))) {
    // "Plank 30 sec" or "Pull-ups 8 reps" with no set count
    if (/^s/i.test(m[2])) {
      type = "hold";
      holdSec = num(m[1]);
    } else reps = num(m[1]);
    flags.push("sets");
    cut = m.index;
    tail = line.slice(m.index + m[0].length);
  } else {
    return null;
  }

  const rawName = cleanName(line.slice(0, cut));
  if (!rawName || rawName.length > 60) return null;
  // Table headers such as "Date Exercise Set 1 Set 2 Set 3" are not exercises.
  if (/\bsets?$/i.test(rawName) || /^(date|day|exercise)\b/i.test(rawName)) return null;

  // Keep the plan's own wording; the library only supplies sensible defaults.
  const lib = matchExercise(rawName);
  const exact = lib && lib.name.toLowerCase() === rawName.toLowerCase();
  const name = exact ? lib.name : rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const defaults = exerciseDefaults(lib);
  if (lib && lib.type === "hold" && type === "reps" && !m[5]) flags.push("type");

  // Rest: an explicit "rest 90s", else the last time value after the target ("… 2–3 min").
  let restSec = null;
  const explicit = line.match(/rest\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(m|min|mins|minutes|s|sec|secs|seconds)?/i);
  let restText = null;
  if (explicit) {
    restSec = /^m/i.test(explicit[2] ?? "") ? Math.round(num(explicit[1]) * 60) : num(explicit[1]);
    restText = explicit[0];
  } else {
    const times = [...tail.matchAll(TIME_RE)];
    const last = times[times.length - 1];
    if (last) {
      restSec = /^m/i.test(last[3]) ? Math.round(num(last[1]) * 60) : num(last[1]);
      restText = last[0];
    }
  }
  if (restSec == null) {
    restSec = defaults.restSec;
    flags.push("restSec");
  }

  const kg = line.match(/(\d+(?:\.\d+)?)\s*kg/i);
  const bracket = line.match(/\(([^)]+)\)/);
  if (bracket) notes.push(bracket[1]);
  // Whatever is left after the target and rest ("each side", "/ side", "or 8–12 sec").
  const extra = (restText ? tail.replace(restText, "") : tail)
    .replace(/\(([^)]+)\)/g, "")
    .replace(/(\d+(?:\.\d+)?)\s*kg/gi, "")
    .replace(/^[\s/,;:—–-]+|[\s/,;:—–-]+$/g, "")
    .replace(/^\/\s*/, "")
    .trim();
  if (extra && extra.length < 40) notes.push(extra);

  return {
    name,
    type,
    sets: sets ?? 3,
    reps: reps ?? "",
    holdSec: holdSec ?? "",
    restSec,
    weightKg: kg ? num(kg[1]) : "",
    notes: notes.join(" · "),
    flags: [...new Set(flags)],
  };
}

// ---------- Diet ----------

// Recipe-style plans: a weekday heading, then for each meal its name, a line like
// "~35 g protein • 15–20 min" (optionally kcal/carbs/fat), INGREDIENTS and PREPARATION.
const DAY_ONLY_RE = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|day\s*\d+)\b\s*(?:[—–:-].*)?$/i;
const NUTRITION_LINE_RE = /^~?\s*(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*g\s+protein\b/i;
const SECTION_END_RE = /^(prep shortcut|daily nutrition check|fibre|fiber|hydration|protein variety|the week|smart shopping|shopping list|notes?)\b/i;
const SLOT_ORDER = { 1: ["Breakfast"], 2: ["Breakfast", "Dinner"], 3: ["Breakfast", "Lunch", "Dinner"], 4: ["Breakfast", "Lunch", "Snack", "Dinner"] };

const mid = (lo, hi) => (hi ? Math.round((Number(lo) + Number(hi)) / 2) : Number(lo));
const grab = (line, re) => {
  const m = line.match(re);
  return m ? mid(m[1], m[2]) : null;
};

function parseDietRecipes(lines) {
  const days = [];
  let day = null;
  let meal = null;
  let mode = null;

  const closeMeal = () => {
    if (!meal) return;
    const ingredients = meal.ingredients.join(" ").replace(/\s+/g, " ").trim();
    const steps = meal.steps.map((s) => s.trim()).filter(Boolean);
    meal.recipe = [ingredients && `Ingredients: ${ingredients}`, steps.length && `Preparation:\n${steps.join("\n")}`].filter(Boolean).join("\n\n");
    delete meal.ingredients;
    delete meal.steps;
    meal = null;
    mode = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (DAY_ONLY_RE.test(line) && line.length < 40) {
      closeMeal();
      day = { name: titleCase(cleanName(line)), weekdays: weekdaysIn(line), meals: [] };
      days.push(day);
      continue;
    }
    if (!day) continue;

    const next = lines[i + 1]?.trim() ?? "";
    if (NUTRITION_LINE_RE.test(next) && !NUTRITION_LINE_RE.test(line) && line.length < 80 && !/^(ingredients|preparation)$/i.test(line)) {
      closeMeal();
      const proteinG = grab(next, NUTRITION_LINE_RE);
      const calories = grab(next, /(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*(?:kcal|cal(?:ories)?)\b/i);
      meal = {
        slot: "Snack",
        name: line,
        serving: "",
        calories: calories ?? "",
        proteinG,
        carbsG: grab(next, /(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*g\s*carbs?/i) ?? "",
        fatG: grab(next, /(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*g\s*fats?/i) ?? "",
        flags: [],
        ingredients: [],
        steps: [],
      };
      day.meals.push(meal);
      i++; // the nutrition line
      continue;
    }
    if (!meal) continue;
    if (SECTION_END_RE.test(line)) {
      closeMeal();
      continue;
    }
    if (/^ingredients$/i.test(line)) mode = "ingredients";
    else if (/^(preparation|method|steps|instructions)$/i.test(line)) mode = "steps";
    else if (mode === "ingredients") meal.ingredients.push(line);
    else if (mode === "steps") {
      if (/^\d+[.)]\s/.test(line) || !meal.steps.length) meal.steps.push(line);
      else meal.steps[meal.steps.length - 1] += ` ${line}`;
    }
  }
  closeMeal();

  for (const d of days) {
    const order = SLOT_ORDER[d.meals.length];
    d.meals.forEach((m, i) => (m.slot = order?.[i] ?? (i === 0 ? "Breakfast" : i === d.meals.length - 1 ? "Dinner" : "Snack")));
  }
  return days.filter((d) => d.meals.length);
}

export function parseDiet(lines) {
  const recipes = parseDietRecipes(lines);
  return recipes.length ? recipes : parseDietLoose(lines);
}

// Loose fallback: meal-slot headings with bullet or quantity lines under them.
function parseDietLoose(lines) {
  const days = [];
  let day = null;
  let slot = "Breakfast";
  const startDay = (name, weekdays = []) => {
    day = { name, weekdays, meals: [] };
    days.push(day);
  };

  for (const raw of lines) {
    const line = raw.trim();
    const slotMatch = line.match(MEAL_SLOT_RE);
    if (slotMatch) {
      slot = normalizeSlot(slotMatch[1]);
      if (!day) startDay("Every day", [0, 1, 2, 3, 4, 5, 6]);
      const rest = line.slice(slotMatch[0].length).trim();
      if (rest.length > 1) day.meals.push(parseMealLine(rest, slot));
      continue;
    }
    if (/^(day\s*\d+|(sun|mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?)day)\b/i.test(line) && line.length < 50) {
      startDay(cleanName(line), weekdaysIn(line));
      continue;
    }
    // Lines under a slot that look like food (bullets, quantities or macros).
    if (day && (BULLET_RE.test(line) || QTY_RE.test(line) || /\d+\s*(kcal|cal)\b/i.test(line)) && line.length < 120) {
      day.meals.push(parseMealLine(line, slot));
    }
  }
  if (!days.length && lines.length) {
    // No headers found: treat bullet lines as one daily list.
    startDay("Every day", [0, 1, 2, 3, 4, 5, 6]);
    for (const l of lines) if (BULLET_RE.test(l)) day.meals.push(parseMealLine(l, "Snack"));
  }
  if (days.length === 1 && !days[0].weekdays.length) days[0].weekdays = [0, 1, 2, 3, 4, 5, 6];
  return days.filter((d) => d.meals.length);
}

function normalizeSlot(s) {
  const t = s.toLowerCase();
  if (t.includes("breakfast") || t.includes("brunch") || t.includes("early")) return "Breakfast";
  if (t.includes("lunch")) return "Lunch";
  if (t.includes("dinner") || t.includes("supper")) return "Dinner";
  return "Snack";
}

const QTY_RE = /(\d+(?:\.\d+)?\s*(?:g|gm|grams|ml|l|cups?|tbsp|tsp|pcs?|pieces?|slices?|scoops?|bowls?|katoris?|plates?|glass(?:es)?))\b/i;

// Library foods by alias: "Roti / Chapati (2)" matches "roti" or "chapati".
const FOOD_ALIASES = FOODS.flatMap((f) =>
  f.name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .split("/")
    .map((a) => a.trim())
    .filter(Boolean)
    .map((alias) => ({ alias, food: f })),
).sort((a, b) => b.alias.length - a.alias.length);

const findFood = (name) => FOOD_ALIASES.find(({ alias }) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(name))?.food;

function parseMealLine(line, slot) {
  const flags = [];
  const grab = (re) => {
    const m = line.match(re);
    return m ? num(m[1]) : null;
  };
  let calories = grab(/(\d+(?:\.\d+)?)\s*(?:kcal|cal(?:ories)?)\b/i) ?? grab(/(?:kcal|calories)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  let proteinG = grab(/(\d+(?:\.\d+)?)\s*g\s*(?:of\s*)?protein/i) ?? grab(/protein\s*[:\-]?\s*(\d+(?:\.\d+)?)/i) ?? grab(/\bP\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g?\b/);
  let carbsG = grab(/(\d+(?:\.\d+)?)\s*g\s*carbs?/i) ?? grab(/carbs?(?:ohydrates?)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i) ?? grab(/\bC\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g?\b/);
  let fatG = grab(/(\d+(?:\.\d+)?)\s*g\s*fats?/i) ?? grab(/fats?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i) ?? grab(/\bF\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g?\b/);

  const withoutMacros = line.replace(
    /\(?\s*(\d+(?:\.\d+)?\s*(kcal|cal(ories)?)|(protein|carbs?|fats?|kcal|calories|[PCF])\s*[:\-]?\s*\d+(?:\.\d+)?\s*g?|\d+(?:\.\d+)?\s*g\s*(protein|carbs?|fats?))\s*\)?[,|/]?/gi,
    "",
  );
  let qty = withoutMacros.match(QTY_RE)?.[1];
  let rest = qty ? withoutMacros.replace(qty, "") : withoutMacros;
  // A bare count before or after the name: "3 whole eggs", "Roti 2".
  const count = rest.replace(BULLET_RE, "").match(/^\s*(\d+)\s+|\s+(\d+)\s*$/);
  if (!qty && count) {
    qty = count[1] ?? count[2];
    rest = rest.replace(BULLET_RE, "").replace(count[0], " ");
  }
  const name = cleanName(rest.replace(/\s+(with|and)\s*$/i, ""));

  const food = findFood(name);
  if (calories == null && proteinG == null && carbsG == null && fatG == null) {
    if (food) {
      ({ calories, proteinG, carbsG, fatG } = food);
      flags.push("calories", "proteinG", "carbsG", "fatG"); // estimated from the library
    } else flags.push("calories", "proteinG");
  } else {
    if (proteinG == null) flags.push("proteinG");
    if (calories == null) flags.push("calories");
  }

  return {
    slot,
    name: name || line,
    serving: qty ?? food?.serving ?? "",
    calories: calories ?? "",
    proteinG: proteinG ?? "",
    carbsG: carbsG ?? "",
    fatG: fatG ?? "",
    recipe: "",
    flags,
  };
}
