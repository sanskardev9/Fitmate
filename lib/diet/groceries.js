import { db } from "@/lib/db/dexie";
import { getMealsForWeekday } from "@/lib/services/dietService";
import { todayKey } from "@/lib/utils";

// Grocery list from the diet plan: reads each meal's "Ingredients: besan 80 g, paneer 100 g, …"
// line, adds the amounts up over the coming days, and groups them for the shop.

const UNIT = {
  g: ["g", 1], gm: ["g", 1], gms: ["g", 1], gram: ["g", 1], grams: ["g", 1], kg: ["g", 1000],
  ml: ["ml", 1], l: ["ml", 1000], ltr: ["ml", 1000], litre: ["ml", 1000], liter: ["ml", 1000],
  tbsp: ["tbsp", 1], tsp: ["tsp", 1], cup: ["cup", 1], cups: ["cup", 1], scoop: ["scoop", 1], scoops: ["scoop", 1],
  slice: ["slice", 1], slices: ["slice", 1], pc: ["pc", 1], pcs: ["pc", 1], piece: ["pc", 1], pieces: ["pc", 1],
};
const UNIT_RE = Object.keys(UNIT).sort((a, b) => b.length - a.length).join("|");
// Cooking words that don't change what you buy ("soaked moong dal" = moong dal).
const PREP = /\b(soaked|chopped|boiled|cooked|crumbled|grated|sliced|diced|fresh|raw|roasted|steamed|mashed|minced|cubed|whisked|beaten|warm|cold|plain)\b/gi;

const tidy = (name) =>
  name
    .replace(PREP, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(of|and)\s+/i, "");

// "low-fat paneer 120 g" | "2 eggs" | "bread 4 slices" | "salt" -> { name, qty, unit }
export function parseIngredient(part) {
  const t = part.trim().replace(/\.$/, "");
  if (!t) return null;
  // "oil 1 tsp (5 g)" / "onion 1 medium (100 g)": the bracketed grams are what we add up.
  const br = t.match(/\((?:≈\s*)?(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\)/i);
  if (br) {
    const [unit, mult] = UNIT[br[2].toLowerCase()];
    const name = t.slice(0, t.search(/\s(?:\d|[¼½¾⅓⅔])/u) >= 0 ? t.search(/\s(?:\d|[¼½¾⅓⅔])/u) : t.indexOf("(")).trim();
    return { name: tidy(name || t.replace(/\(.*\)/, "")), qty: Number(br[1]) * mult, unit };
  }
  let m = t.match(new RegExp(`^(.*?)\\s+(\\d+(?:\\.\\d+)?)\\s*(${UNIT_RE})?\\b(.*)$`, "i"));
  if (m && m[1].trim()) {
    const [unit, mult] = UNIT[m[3]?.toLowerCase()] ?? ["pc", 1];
    const note = m[4].trim();
    return { name: tidy(m[1]) + (/\bdry\b/i.test(note) ? " (dry)" : ""), qty: Number(m[2]) * mult, unit };
  }
  m = t.match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${UNIT_RE})?\\s+(.+)$`, "i"));
  if (m) {
    const [unit, mult] = UNIT[m[2]?.toLowerCase()] ?? ["pc", 1];
    return { name: tidy(m[3]), qty: Number(m[1]) * mult, unit };
  }
  return { name: tidy(t), qty: null, unit: null };
}

export function ingredientsOf(recipe) {
  const line = String(recipe ?? "")
    .split("\n")
    .find((l) => /^\s*ingredients\s*:/i.test(l));
  if (!line) return [];
  return line
    .replace(/^\s*ingredients\s*:/i, "")
    .split(/,|;/)
    .map(parseIngredient)
    .filter((x) => x && x.name.length > 1);
}

export const GROUPS = [
  ["Vegetables", /\b(onion|tomato|cucumber|spinach|palak|capsicum|bell pepper|carrot|peas|beans|cabbage|cauliflower|potato|sweet potato|garlic|ginger|chilli|chili|coriander|mint|mushroom|broccoli|lettuce|beetroot|lauki|bottle gourd|bhindi|okra|methi|zucchini|veggies|vegetables?|salad|greens|sweet corn|pumpkin|brinjal|eggplant|radish|celery)/i],
  ["Fruits", /\b(banana|apple|berries|berry|strawberr|blueberr|orange|mango|papaya|dates|lemon|lime|grapes|pomegranate|pineapple|watermelon|kiwi|pear|guava|avocado|fruit)/i],
  ["Dairy & eggs", /\b(paneer|curd|dahi|milk|yogurt|yoghurt|cheese|egg|eggs|whey|butter|buttermilk|chaas|cream|skyr|kefir)/i],
  ["Protein", /\b(tofu|soya|soy|chicken|fish|mutton|prawn|shrimp|tempeh|turkey|tuna|salmon|seitan)/i],
  ["Pulses", /\b(dal|moong|masoor|chana|rajma|chole|chickpea|lentil|sprouts|urad|toor|arhar|lobia|kidney bean|black bean)/i],
  ["Grains & flour", /\b(atta|rice|oats|bread|besan|poha|rava|suji|semolina|quinoa|millet|roti|dalia|flour|pasta|noodles|ragi|bajra|jowar|wrap|tortilla|muesli|granola|cornflakes|vermicelli)/i],
  ["Nuts & seeds", /\b(peanut|almond|walnut|cashew|chia|flax|seeds?|pistachio|makhana|nuts?)/i],
  ["Oils & spices", /\b(oil|ghee|spice|spices|salt|masala|jeera|cumin|haldi|turmeric|pepper|honey|sugar|jaggery|vinegar|sauce|ketchup|chutney|pickle)/i],
];
export const groupOf = (name) => GROUPS.find(([, re]) => re.test(name))?.[0] ?? "Other";

const keyOf = (name) =>
  name
    .replace(/\s*\(dry\)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9() ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(?<=[a-z]{3})(es|s)$/, "");

// Meals for each of the next `days` days (today first), using today's swaps where you made them.
export async function upcomingMeals(planId, days = 7) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = todayKey(d);
    const [meals, swapRow] = await Promise.all([getMealsForWeekday(planId, d.getDay()), db.preferences.get(`mealSwaps_${key}`)]);
    const swaps = swapRow?.value ?? {};
    out.push({ key, date: d, meals: meals.map((m) => (swaps[m.id] ? { ...m, ...swaps[m.id], swappedFrom: m.name } : m)) });
  }
  return out;
}

// Everything to buy for those days: summed per ingredient, grouped, with how many meals use it.
export function groceryList(days) {
  const items = new Map();
  let meals = 0;
  let unparsed = 0;
  for (const day of days) {
    for (const meal of day.meals) {
      meals++;
      const ings = ingredientsOf(meal.recipe);
      if (!ings.length) unparsed++;
      for (const ing of ings) {
        const k = `${keyOf(ing.name)}|${ing.unit ?? ""}`;
        const cur = items.get(k) ?? { name: ing.name, unit: ing.unit, qty: 0, hasQty: false, uses: 0, group: groupOf(ing.name) };
        if (ing.qty != null) {
          cur.qty += ing.qty;
          cur.hasQty = true;
        }
        cur.uses++;
        items.set(k, cur);
      }
    }
  }
  const groups = {};
  for (const it of items.values()) (groups[it.group] ??= []).push(it);
  const order = [...GROUPS.map(([g]) => g), "Other"];
  return {
    meals,
    unparsed,
    groups: order.filter((g) => groups[g]).map((g) => ({ name: g, items: groups[g].sort((a, b) => a.name.localeCompare(b.name)) })),
  };
}

export function amountLabel(it) {
  if (!it.hasQty) return "as needed";
  if (it.unit === "g") return it.qty >= 1000 ? `${+(it.qty / 1000).toFixed(2)} kg` : `${Math.round(it.qty)} g`;
  if (it.unit === "ml") return it.qty >= 1000 ? `${+(it.qty / 1000).toFixed(2)} L` : `${Math.round(it.qty)} ml`;
  const n = +it.qty.toFixed(1);
  return `${n} ${it.unit === "pc" ? "" : it.unit}${it.unit !== "pc" && n !== 1 && !/s$/.test(it.unit) ? "s" : ""}`.trim();
}

// ---------------------------------------------------------------- kitchen amounts
// Recipes store grams (exact for macros), but people cook with spoons, cups and "1 onion".
// friendlyRecipe() rewrites the "Ingredients:" line for display: "oil 5 g" -> "oil 1 tsp (5 g)",
// "onion 50 g" -> "onion ½ medium (50 g)". Lines already in kitchen amounts are left alone.
const FRACTIONS = [[0.25, "¼"], [0.5, "½"], [0.75, "¾"]];
function nice(n) {
  const q = Math.round(n * 4) / 4 || 0.25; // nearest quarter, at least ¼
  const whole = Math.floor(q + 1e-9);
  const frac = q - whole;
  const f = FRACTIONS.find(([v]) => Math.abs(v - frac) < 0.09)?.[1] ?? "";
  return `${whole || ""}${f}` || "¼";
}
// Each: words it matches, grams per unit, unit label (singular/plural).
const KITCHEN = [
  [/\b(oil|ghee|butter)\b/i, 5, "tsp", "tsp", 15, "tbsp"],
  [/\b(honey|jaggery|sugar|peanut butter)\b/i, 7, "tsp", "tsp", 21, "tbsp"],
  [/\bonions?\b/i, 100, "medium", "medium"],
  [/\btomato(es)?\b/i, 100, "medium", "medium"],
  [/\bpotato(es)?\b/i, 150, "medium", "medium"],
  [/\bbananas?\b/i, 120, "medium", "medium"],
  [/\bapples?\b/i, 180, "medium", "medium"],
  [/\bcarrots?\b/i, 60, "medium", "medium"],
  [/\bcucumbers?\b/i, 200, "medium", "medium"],
  [/\b(capsicum|bell peppers?)\b/i, 120, "medium", "medium"],
  [/\b(atta|whole wheat flour)\b/i, 30, "roti", "rotis"],
  [/\b(curd|dahi|yogurt|yoghurt|hung curd|milk|buttermilk)\b/i, 240, "cup", "cups"],
  [/\b(rice|basmati)\b/i, 190, "cup", "cups"],
  [/\b(oats|soya granules|besan|poha|suji|rava|semolina|quinoa|dalia)\b/i, 90, "cup", "cups"],
];

function friendlyPart(part) {
  const raw = part.trim();
  if (!raw || /\(/.test(raw) || /\b(tsp|tbsp|cup|cups|medium|small|large|roti|rotis|slice|slices)\b/i.test(raw)) return raw; // already kitchen-style
  const ing = parseIngredient(raw);
  if (!ing?.qty || (ing.unit !== "g" && ing.unit !== "ml")) return raw;
  const k = KITCHEN.find(([re]) => re.test(ing.name));
  if (!k) return raw;
  const [, per, one, many, bigPer, bigUnit] = k;
  const grams = `${Math.round(ing.qty)} ${ing.unit}`;
  const [count, label] = bigPer && ing.qty >= bigPer ? [ing.qty / bigPer, bigUnit] : [ing.qty / per, null];
  const unit = label ?? (count > 1 ? many : one);
  // Flour shows the rotis it makes; everything else leads with the kitchen amount.
  if (unit === "roti" || unit === "rotis") return `${ing.name} ${grams} (≈ ${nice(count)} ${count > 1 ? "rotis" : "roti"})`;
  return `${ing.name} ${nice(count)} ${unit} (${grams})`;
}

export function friendlyRecipe(recipe) {
  if (!recipe) return recipe;
  return String(recipe)
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\s*ingredients\s*:\s*)(.*)$/i);
      if (!m) return line;
      return m[1] + m[2].split(",").map(friendlyPart).join(", ");
    })
    .join("\n");
}

// A recipe's ingredients as short kitchen-amount strings ("2 tbsp oil (10 g)"), for listing under a dish.
export function friendlyIngredients(recipe) {
  const line = String(recipe ?? "")
    .split("\n")
    .find((l) => /^\s*ingredients\s*:/i.test(l));
  if (!line) return [];
  return line
    .replace(/^\s*ingredients\s*:/i, "")
    .split(",")
    .map((p) => friendlyPart(p).trim())
    .filter(Boolean);
}
