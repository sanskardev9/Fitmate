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
  return { kind: type, name: String(data.name ?? ""), days };
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
    flags,
  };
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
        { name: "Tuck Planche Push-up", sets: 3, reps: 6, restSec: 120, notes: "Slow lowering" },
        { name: "Planche Lean", sets: 4, holdSec: 20, restSec: 120 },
        { name: "Weighted Dip", sets: 3, reps: 8, restSec: 120, weightKg: 10 },
        { name: "Shoulder Stretch", section: "cooldown", sets: 1, holdSec: 30, restSec: 15 },
      ],
    },
    {
      name: "Pull Day",
      weekdays: ["Tue", "Fri"],
      exercises: [
        { name: "Pull-up", sets: 4, reps: 8, restSec: 120 },
        { name: "Tuck Front Lever", sets: 4, holdSec: 10, restSec: 150 },
      ],
    },
  ],
};

export const DIET_TEMPLATE = {
  type: "diet",
  name: "My Diet Plan",
  days: [
    {
      name: "Every day",
      weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      meals: [
        { slot: "Breakfast", name: "Oats with milk", serving: "50 g oats", calories: 320, proteinG: 15, carbsG: 45, fatG: 8, videoUrl: "https://www.youtube.com/watch?v=VIDEO_ID" },
        { slot: "Lunch", name: "Chicken breast with rice", serving: "150 g + 1 cup", calories: 450, proteinG: 50, carbsG: 45, fatG: 6 },
        { slot: "Snack", name: "Whey protein shake", serving: "1 scoop", calories: 120, proteinG: 24, carbsG: 3, fatG: 2 },
        { slot: "Dinner", name: "Paneer with roti", serving: "100 g + 2 roti", calories: 500, proteinG: 26, carbsG: 50, fatG: 23 },
      ],
    },
  ],
};

export function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
