import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { DISH_CATEGORIES } from "@/lib/diet/categories";

// Adds dishes from a saved diet plan to the shared catalog (signed-in users only; writes with the
// secret key). Only complete, tagged dishes are kept: slot, category from the fixed list, diet
// type and real numbers, so swap suggestions stay accurate.
const SLOTS = ["Breakfast", "Lunch", "Snack", "Dinner"];
const DIETS = ["veg", "egg", "nonveg", "vegan"];
const CATS = new Map(DISH_CATEGORIES.map((c) => [c.toLowerCase(), c]));
const MAX = 300;
const num = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const tidy = (t) => String(t ?? "").replace(/\s+/g, " ").trim();

export async function POST(request) {
  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ error: "Not configured." }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: null };
  if (!auth?.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const rows = new Map();
  for (const d of (Array.isArray(body?.dishes) ? body.dishes : []).slice(0, MAX)) {
    const name = tidy(d?.name).slice(0, 120);
    const slot = SLOTS.find((x) => x.toLowerCase() === String(d?.slot ?? "").toLowerCase());
    const category = CATS.get(String(d?.category ?? "").trim().toLowerCase());
    const diet = DIETS.find((x) => x === String(d?.diet ?? "").trim().toLowerCase());
    const calories = num(d?.calories);
    const protein = num(d?.proteinG);
    if (name.length < 2 || !slot || !category || !diet || !(calories >= 20 && calories <= 3000) || !(protein >= 0 && protein <= 300)) continue;
    // Strip "Pre-workout -" style prefixes so the same dish isn't stored twice.
    const clean = name.replace(/^(pre|post)[- ]?workout\s*[-:–]\s*/i, "");
    rows.set(`${clean.toLowerCase()}|${slot}`, {
      dish_key: `${clean.toLowerCase()}|${slot}`.slice(0, 140),
      name: clean,
      slot,
      category,
      diet,
      calories: Math.round(calories),
      protein_g: protein,
      carbs_g: num(d?.carbsG),
      fat_g: num(d?.fatG),
      serving: tidy(d?.serving).slice(0, 200) || null,
      recipe: String(d?.recipe ?? "").slice(0, 1500) || null,
    });
  }
  const list = [...rows.values()];
  if (!list.length) return Response.json({ added: 0, updated: 0 });

  const { data: existing, error } = await admin.from("dish_catalog").select("dish_key, uses").in("dish_key", list.map((r) => r.dish_key));
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const known = new Map(existing.map((r) => [r.dish_key, r.uses]));
  const fresh = list.filter((r) => !known.has(r.dish_key));
  if (fresh.length) {
    const { error: e } = await admin.from("dish_catalog").upsert(fresh, { onConflict: "dish_key", ignoreDuplicates: true });
    if (e) return Response.json({ error: e.message }, { status: 500 });
  }
  for (const r of list.filter((r) => known.has(r.dish_key))) await admin.from("dish_catalog").update({ uses: known.get(r.dish_key) + 1 }).eq("dish_key", r.dish_key);
  return Response.json({ added: fresh.length, updated: list.length - fresh.length });
}
