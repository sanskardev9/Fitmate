import { EXERCISES } from "@/lib/data/exercises";
import { inferSections, normalizeSection } from "@/lib/workout/sections";

// Plan JSON files: a FitMate plan template ({ type: "workout" | "diet", name, days }) or a full
// FitMate backup (format "fitmate-backup"). Plans are normalised to the same shape the PDF
// parser produces, with missing values flagged for review.

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

const toNum = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));

function weekdays(list) {
  if (!Array.isArray(list)) return [];
  return [
    ...new Set(
      list
        .map((d) => (typeof d === "number" ? d : WEEKDAYS.indexOf(String(d).trim().toLowerCase().slice(0, 3))))
        .filter((d) => d >= 0 && d <= 6),
    ),
  ].sort();
}

export function parsePlanJson(data) {
  if (data?.format === "fitmate-backup") return { kind: "backup", backup: data };

  const type = String(data?.type ?? "").toLowerCase();
  if (!["workout", "diet"].includes(type) || !Array.isArray(data?.days)) {
    throw new Error('Not a FitMate plan file. It needs "type": "workout" or "diet" and a "days" list. Download a template to see the format.');
  }

  const days = data.days.map((d, i) => {
    const day = { name: String(d?.name ?? `Day ${i + 1}`), weekdays: weekdays(d?.weekdays) };
    if (type === "workout") day.exercises = inferSections((d?.exercises ?? []).map(workoutItem).filter(Boolean));
    else day.meals = (d?.meals ?? []).map(mealItem).filter(Boolean);
    return day;
  });
  if (type === "diet" && days.length === 1 && !days[0].weekdays.length) days[0].weekdays = EVERY_DAY;

  const items = days.reduce((n, d) => n + (d.exercises ?? d.meals).length, 0);
  if (!items) throw new Error(`No ${type === "workout" ? "exercises" : "meals"} found in this file.`);
  return { kind: type, name: String(data.name ?? ""), days, groceries: type === "diet" ? groceriesOf(data.groceries) : undefined };
}

// Exercise swaps from the plan: [{ name, type, sets, reps, holdSec, notes }] (max 3).
function alternativesOf(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((a) => a?.name && String(a.name).trim())
    .slice(0, 3)
    .map((a) => {
      const holdSec = toNum(a.holdSec ?? a.hold_sec ?? a.seconds);
      const reps = toNum(a.reps);
      return {
        name: String(a.name).trim().slice(0, 80),
        type: holdSec != null && reps == null ? "hold" : "reps",
        sets: toNum(a.sets),
        reps: reps ?? null,
        holdSec: holdSec ?? null,
        notes: String(a.notes ?? "").slice(0, 200),
      };
    });
}

function workoutItem(e) {
  if (!e?.name) return null;
  const flags = [];
  const holdSec = toNum(e.holdSec ?? e.hold_sec ?? e.seconds);
  const reps = toNum(e.reps);
  const type = holdSec != null && reps == null ? "hold" : "reps";
  const sets = toNum(e.sets);
  const restSec = toNum(e.restSec ?? e.rest_sec ?? e.rest);
  if (sets == null) flags.push("sets");
  if (reps == null && holdSec == null) flags.push(type === "hold" ? "holdSec" : "reps");
  if (restSec == null) flags.push("restSec");
  return {
    name: String(e.name),
    type,
    sets: sets ?? 3,
    reps: reps ?? "",
    holdSec: holdSec ?? "",
    restSec: restSec ?? 90,
    weightKg: toNum(e.weightKg ?? e.weight_kg ?? e.weight) ?? "",
    notes: String(e.notes ?? ""),
    section: normalizeSection(e.section),
    alternatives: alternativesOf(e.alternatives),
    flags,
  };
}

const GROCERY_GROUPS = ["Vegetables", "Fruits", "Dairy & eggs", "Protein", "Pulses", "Grains & flour", "Nuts & seeds", "Oils & spices", "Other"];
function groceriesOf(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((g) => g?.item && String(g.item).trim())
    .slice(0, 120)
    .map((g) => ({
      item: String(g.item).trim().slice(0, 80),
      amount: String(g.amount ?? "").trim().slice(0, 40),
      group: GROCERY_GROUPS.find((x) => x.toLowerCase() === String(g.group ?? "").trim().toLowerCase()) ?? "Other",
    }));
}

function mealItem(m) {
  if (!m?.name) return null;
  const flags = [];
  const pick = (...keys) => toNum(keys.map((k) => m[k]).find((v) => v != null));
  const calories = pick("calories", "kcal");
  const proteinG = pick("proteinG", "protein_g", "protein");
  if (calories == null) flags.push("calories");
  if (proteinG == null) flags.push("proteinG");
  const slot = ["Breakfast", "Lunch", "Snack", "Dinner"].find((s) => s.toLowerCase() === String(m.slot ?? m.meal ?? "").toLowerCase()) ?? "Snack";
  return {
    slot,
    name: String(m.name),
    serving: String(m.serving ?? m.quantity ?? ""),
    calories: calories ?? "",
    proteinG: proteinG ?? "",
    carbsG: pick("carbsG", "carbs_g", "carbs") ?? "",
    fatG: pick("fatG", "fat_g", "fat") ?? "",
    recipe: String(m.recipe ?? ""),
    videoUrl: String(m.videoUrl ?? m.video ?? m.youtube ?? ""),
    category: String(m.category ?? ""),
    diet: String(m.diet ?? "").toLowerCase(),
    videoSearch: String(m.videoSearch ?? "").trim(),
    timing: String(m.timing ?? "").toLowerCase(),
    alternatives: (Array.isArray(m.alternatives) ? m.alternatives : [])
      .filter((a) => a?.name)
      .slice(0, 5)
      .map((a) => ({ name: String(a.name), serving: String(a.serving ?? ""), calories: toNum(a.calories ?? a.kcal), proteinG: toNum(a.proteinG ?? a.protein), carbsG: toNum(a.carbsG ?? a.carbs), fatG: toNum(a.fatG ?? a.fat), recipe: String(a.recipe ?? ""), videoUrl: String(a.videoUrl ?? ""), category: String(a.category ?? ""), diet: String(a.diet ?? "").toLowerCase(), videoSearch: String(a.videoSearch ?? "").trim() })),
    flags,
  };
}

export const WORKOUT_TEMPLATE = {
  type: "workout",
  name: "My Calisthenics Plan",
  days: [
    {
      name: "Push Day",
      weekdays: ["Mon", "Thu"],
      exercises: [
        { name: "Wrist Mobility", section: "warmup", sets: 1, reps: 15, restSec: 20 },
        { name: "Tuck Planche Push-up", sets: 3, reps: 6, restSec: 120, notes: "Slow lowering", alternatives: [{ name: "Pseudo Planche Push-up", sets: 3, reps: 8, notes: "Easier" }, { name: "Ring Push-up", sets: 3, reps: 10, notes: "Rings instead of floor" }] },
        { name: "Planche Lean", sets: 4, holdSec: 20, restSec: 120 },
        { name: "Weighted Dip", sets: 3, reps: 8, restSec: 120, weightKg: 10 },
        { name: "Shoulder Stretch", section: "cooldown", sets: 1, holdSec: 30, restSec: 15 },
      ],
    },
    {
      name: "Pull Day",
      weekdays: ["Tue", "Fri"],
      exercises: [
        { name: "Pull-up", sets: 4, reps: 8, restSec: 120, alternatives: [{ name: "Band-assisted Pull-up", sets: 4, reps: 8, notes: "Easier" }, { name: "Inverted Row", sets: 4, reps: 12, notes: "No bar high enough" }] },
        { name: "Tuck Front Lever", sets: 4, holdSec: 10, restSec: 150 },
      ],
    },
  ],
};

export const DIET_TEMPLATE = {
  type: "diet",
  name: "My Diet Plan",
  groceries: [
    { item: "Paneer (low-fat)", amount: "1 kg", group: "Dairy & eggs" },
    { item: "Onions", amount: "1 kg", group: "Vegetables" },
    { item: "Mustard oil", amount: "250 ml", group: "Oils & spices" },
  ],
  days: [
    {
      name: "Monday",
      weekdays: [
        "Mon"
      ],
      meals: [
        {
          slot: "Breakfast",
          name: "Masala oats with soya and curd",
          category: "Oats",
          diet: "veg",
          serving: "50 g oats + 30 g soya + 150 g curd",
          calories: 520,
          proteinG: 36,
          carbsG: 62,
          fatG: 12,
          recipe: "Prep: 15 min\nIngredients: oats 50 g, soya granules 30 g, curd 150 g, onion 1\n1. Soak soya in hot water, squeeze.\n2. Cook onion, soya and oats with water and spices.\n3. Serve with curd.",
          alternatives: [
            {
              name: "Besan paneer chilla",
              category: "Chilla & dosa",
              diet: "veg",
              serving: "60 g besan + 80 g paneer",
              calories: 510,
              proteinG: 35,
              carbsG: 40,
              fatG: 20,
              recipe: "Prep: 15 min\nIngredients: besan 60 g, paneer 80 g, onion 1\n1. Mix besan with water, onion and spices.\n2. Cook 2 chillas.\n3. Fill with crumbled paneer."
            },
            {
              name: "Soya poha with peanuts",
              category: "Poha & upma",
              diet: "veg",
              serving: "60 g poha + 30 g soya + 15 g peanuts",
              calories: 530,
              proteinG: 34,
              carbsG: 66,
              fatG: 13,
              recipe: "Prep: 15 min\nIngredients: poha 60 g, soya granules 30 g, peanuts 15 g\n1. Soak soya, squeeze.\n2. Rinse poha.\n3. Cook with soya, peanuts and spices."
            },
            {
              name: "Paneer hung-curd sandwich",
              category: "Sandwich & toast",
              diet: "veg",
              serving: "3 slices + 80 g paneer + 100 g hung curd",
              calories: 520,
              proteinG: 35,
              carbsG: 50,
              fatG: 18,
              recipe: "Prep: 10 min\nIngredients: bread 3 slices, paneer 80 g, hung curd 100 g\n1. Mix paneer with hung curd and spices.\n2. Fill bread.\n3. Toast both sides."
            }
          ]
        },
        {
          slot: "Lunch",
          name: "Rajma rice with curd",
          category: "Rice",
          diet: "veg",
          serving: "1 cup rajma + 1 cup rice + 150 g curd",
          calories: 640,
          proteinG: 36,
          carbsG: 98,
          fatG: 10,
          recipe: "Prep: 20 min (rajma cooked ahead)\nIngredients: rajma 1 cup cooked, rice 1 cup cooked, curd 150 g, onion 1, tomato 1\n1. Cook onion, tomato and spices.\n2. Add rajma, simmer 5 min.\n3. Serve with rice and curd.",
          alternatives: [
            {
              name: "Soya chunk curry with 2 roti",
              category: "Dal & curry",
              diet: "veg",
              serving: "50 g soya + 2 roti",
              calories: 630,
              proteinG: 37,
              carbsG: 80,
              fatG: 14,
              recipe: "Prep: 20 min\nIngredients: soya chunks 50 g, atta 60 g, onion 1, tomato 1\n1. Boil soya, squeeze.\n2. Cook with onion, tomato and spices.\n3. Serve with 2 roti."
            },
            {
              name: "Paneer bhurji wrap",
              category: "Paratha & roti",
              diet: "veg",
              serving: "2 roti + 100 g paneer",
              calories: 620,
              proteinG: 35,
              carbsG: 60,
              fatG: 24,
              recipe: "Prep: 15 min\nIngredients: atta 60 g, paneer 100 g, onion 1, capsicum 1\n1. Cook onion and capsicum.\n2. Crumble in paneer with spices.\n3. Roll in 2 roti."
            },
            {
              name: "Chana salad bowl with curd",
              category: "Salad",
              diet: "veg",
              serving: "1.5 cup chana + 200 g curd",
              calories: 610,
              proteinG: 34,
              carbsG: 78,
              fatG: 14,
              recipe: "Prep: 10 min (chana cooked ahead)\nIngredients: boiled chana 1.5 cup, curd 200 g, cucumber, onion, lemon\n1. Chop vegetables.\n2. Mix with chana, lemon and spices.\n3. Serve with curd."
            }
          ]
        }
      ]
    }
  ]
};


export function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
