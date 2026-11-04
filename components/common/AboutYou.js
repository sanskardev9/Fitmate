"use client";

import { useState } from "react";
import { Scale, BicepsFlexed, Dumbbell, Weight, PersonStanding, HeartPulse, ChartNoAxesColumn, PencilLine, Flame, Beef, Wheat, Droplet, Leaf, GlassWater } from "lucide-react";
import { suggestTargets } from "@/lib/services/profileService";
import FocusPicker from "./FocusPicker";
import { COVERED_BY_GOAL } from "@/lib/focuses";

// Minimum details a generated plan needs to be accurate (calories and macros are worked out
// from them). Asked once at sign-up; also shown in "Make me a plan" if anything is missing.
export const ABOUT_FIELDS = ["gender", "date_of_birth", "height_cm", "weight_kg", "goal", "training_days_per_week"];
export const missingAbout = (p) => ABOUT_FIELDS.filter((k) => !p?.[k]);

const GOALS = [
  ["lose_fat", "Lose fat", "Reduce body fat while keeping muscle", Scale],
  ["recomposition", "Lose fat & build muscle", "Get leaner while building muscle", BicepsFlexed],
  ["build_muscle", "Build muscle", "Focus on muscle growth and size", Dumbbell],
  ["gain_strength", "Get stronger", "Lift more, perform better", Weight],
  ["calisthenics_skills", "Learn calisthenics skills", "Handstand, planche, front lever and more", PersonStanding],
  ["general_fitness", "Improve overall fitness", "Strength, stamina and daily energy", HeartPulse],
  ["maintain", "Maintain my progress", "Keep your current weight and fitness", ChartNoAxesColumn],
];

// Unsaved answers survive a refresh (or pull-to-refresh): kept on the device until "Continue".
const DRAFT_KEY = "fitmate:aboutDraft";
function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
  } catch {
    return null;
  }
}
function writeDraft(v) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
  } catch {}
}
export function clearAboutDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}
const filled = (v) => v !== "" && v != null && !(Array.isArray(v) && !v.length);

const ageOf = (dob) => (dob ? String(Math.floor((Date.now() - new Date(dob)) / 31_557_600_000)) : "");
export const dobFromAge = (age) => (Number(age) >= 10 && Number(age) <= 100 ? `${new Date().getFullYear() - Number(age)}-01-01` : null);

const label = "mb-1.5 block text-xs font-semibold tracking-wide text-neutral-500 uppercase";

function UnitBox({ value, onChange, unit, placeholder, className = "" }) {
  return (
    <div className={`flex h-12 items-center rounded-xl border border-neutral-300 pr-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-neutral-700 ${className}`}>
      <input type="number" inputMode="decimal" min="0" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-full w-full min-w-0 bg-transparent pl-2.5 text-base font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-neutral-400" />
      <span className="ml-1 shrink-0 text-sm text-neutral-500">{unit}</span>
    </div>
  );
}

// One goal per row: icon, title + one line, radio on the right.
function GoalRow({ on, onClick, Icon, title, sub }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors active:scale-[0.99] ${on ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500" : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/60"}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${on ? "bg-emerald-600 text-white" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-tight font-semibold">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-neutral-500">{sub}</span>
      </span>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-emerald-600" : "border-neutral-300 dark:border-neutral-600"}`}>
        {on && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
      </span>
    </button>
  );
}

// Live daily targets worked out from the details above.
function Targets({ t }) {
  const items = t?.calories_target
    ? [
        [Flame, "Calories", `${t.calories_target.toLocaleString()}`, "kcal", "text-orange-500"],
        [Beef, "Protein", t.protein_target_g, "g", "text-emerald-600 dark:text-emerald-400"],
        [Wheat, "Carbs", t.carbs_g, "g", "text-amber-600 dark:text-amber-400"],
        [Droplet, "Fat", t.fat_g, "g", "text-rose-500"],
        [Leaf, "Fibre", t.fiber_g, "g", "text-lime-600 dark:text-lime-400"],
        [GlassWater, "Water", t.water_l, "L", "text-sky-500"],
      ]
    : null;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
      <p className="text-sm font-semibold">Your daily targets</p>
      {items ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {items.map(([Icon, name, val, unit, tint]) => (
              <div key={name} className="rounded-xl bg-white p-3 dark:bg-neutral-900">
                <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <Icon className={`h-3.5 w-3.5 ${tint}`} /> {name}
                </span>
                <span className="mt-1 block text-lg font-bold tabular-nums">
                  {val}
                  <span className="ml-0.5 text-xs font-medium text-neutral-500">{unit}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-neutral-500">
            Maintenance ≈ {t.maintenance.toLocaleString()} kcal{t.adjust ? `, ${t.adjust > 0 ? "+" : "−"}${Math.abs(t.adjust)} for your goal` : ""}. Fat 25% of calories, carbs fill the rest.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-neutral-500">Fill in your details to see calories, protein, carbs, fat, fibre and water.</p>
      )}
    </div>
  );
}

// value: { gender, age, height_cm, weight_kg, target_weight_kg, goal, goal_note }
export default function AboutYou({ value, onChange, error }) {
  const set = (k, v) => {
    const next = { ...value, [k]: v };
    writeDraft(next);
    onChange(next);
  };
  const [showOwn, setShowOwn] = useState(false);
  const dob = dobFromAge(value.age);
  const t =
    value.gender && dob && Number(value.height_cm) && Number(value.weight_kg) && value.goal && value.days !== ""
      ? suggestTargets({ gender: value.gender, date_of_birth: dob, height_cm: value.height_cm, weight_kg: value.weight_kg, target_weight_kg: value.target_weight_kg, goal: value.goal, training_days_per_week: value.days })
      : null;

  return (
    <div className="@container rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid gap-6 @3xl:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          <p className="text-base font-semibold">About you</p>
          <p className="mt-0.5 text-sm text-neutral-500">Used to set your daily targets. Saved to your profile.</p>

          <div className="mt-5">
            <span className={label}>Gender</span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
              {[
                ["male", "Male"],
                ["female", "Female"],
              ].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set("gender", v)} className={`h-10 rounded-lg text-sm font-semibold transition-all ${value.gender === v ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-white" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="min-w-0">
              <span className={label}>Age</span>
              <UnitBox value={value.age} onChange={(v) => set("age", v)} unit="yrs" placeholder="24" />
            </div>
            <div className="min-w-0">
              <span className={label}>Height</span>
              <UnitBox value={value.height_cm} onChange={(v) => set("height_cm", v)} unit="cm" placeholder="170" />
            </div>
            <div className="min-w-0">
              <span className={label}>Weight</span>
              <UnitBox value={value.weight_kg} onChange={(v) => set("weight_kg", v)} unit="kg" placeholder="70" />
            </div>
          </div>

          <div className="mt-4">
            <span className={label}>Training days a week</span>
            <div className="grid grid-cols-8 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button key={d} type="button" onClick={() => set("days", String(d))} className={`h-10 rounded-lg text-sm font-semibold tabular-nums transition-all ${value.days === String(d) ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-white" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <span className={label}>Goal</span>
            <p className="-mt-0.5 mb-2 text-sm text-neutral-500">Choose one to personalise your plan.</p>
            <div role="radiogroup" aria-label="Goal" className="space-y-2">
              {GOALS.map(([v, title, sub, Icon]) => (
                <GoalRow key={v} on={value.goal === v} onClick={() => set("goal", v)} Icon={Icon} title={title} sub={sub} />
              ))}
              <GoalRow on={showOwn || Boolean(value.goal_note)} onClick={() => setShowOwn((s) => !s)} Icon={PencilLine} title="Add your own goal" sub="In your words. The AI reads it as-is." />
            </div>
            {(showOwn || value.goal_note) && (
              <input
                autoFocus={showOwn && !value.goal_note}
                value={value.goal_note ?? ""}
                onChange={(e) => set("goal_note", e.target.value.slice(0, 200))}
                placeholder="e.g. first muscle-up, run a 10k"
                className="mt-2 h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700"
              />
            )}
          </div>

          <div className="mt-5">
            <FocusPicker goal={value.goal} value={value.focuses ?? []} onChange={(v) => set("focuses", v)} />
          </div>

          <div className="mt-5">
            <span className={label}>
              Target weight <span className="font-normal tracking-normal normal-case">(optional)</span>
            </span>
            <UnitBox value={value.target_weight_kg} onChange={(v) => set("target_weight_kg", v)} unit="kg" placeholder="65" className="max-w-[9rem]" />
          </div>
        </div>

        <div className="min-w-0 @3xl:sticky @3xl:top-24 @3xl:self-start">
          <Targets t={t} />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// { draft: true } lays unsaved answers from this device over the profile (client only).
export const aboutFromProfile = (p, { draft = false } = {}) => {
  const base = aboutBase(p);
  const d = draft && typeof window !== "undefined" ? readDraft() : null;
  if (!d) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(d)) if (k in base && filled(v)) out[k] = v;
  return out;
};

const aboutBase = (p) => ({
  gender: p?.gender ?? "",
  age: ageOf(p?.date_of_birth),
  height_cm: p?.height_cm ?? "",
  weight_kg: p?.weight_kg ?? "",
  target_weight_kg: p?.target_weight_kg ?? "",
  goal: p?.goal ?? "",
  goal_note: p?.goal_note ?? "",
  focuses: p?.focuses ?? [],
  days: p?.training_days_per_week != null ? String(p.training_days_per_week) : "",
});

export async function saveAbout({ userId, name, about, trainingDays }) {
  const { saveProfile } = await import("@/lib/services/profileService");
  const dob = dobFromAge(about.age);
  if (!about.gender || !dob || !Number(about.height_cm) || !Number(about.weight_kg) || !about.goal || about.days === "" || about.days == null) {
    return { error: "Fill in gender, age, height, weight, training days and goal so your plan fits you." };
  }
  const fields = {
    full_name: name || "Athlete",
    gender: about.gender,
    date_of_birth: dob,
    height_cm: Number(about.height_cm),
    weight_kg: Number(about.weight_kg),
    target_weight_kg: Number(about.target_weight_kg) || null,
    goal: about.goal,
    goal_note: String(about.goal_note ?? "").trim() || null,
    // Drop an extra the main goal already covers (e.g. goal "Calisthenics skills" + extra "skills").
    focuses: (about.focuses ?? []).filter((x) => x !== COVERED_BY_GOAL[about.goal]),
    training_days_per_week: Number(about.days),
  };
  const t = suggestTargets({ ...fields, training_days_per_week: Number(about.days) ?? trainingDays });
  try {
    const profile = await saveProfile(userId, { ...fields, protein_target_g: t.protein_target_g ?? null, calories_target: t.calories_target ?? null });
    const { setPreference } = await import("@/lib/services/preferencesService");
    if (t.carbs_g != null) await setPreference("carbsTargetG", t.carbs_g);
    if (t.fat_g != null) await setPreference("fatTargetG", t.fat_g);
    clearAboutDraft();
    return { profile };
  } catch (err) {
    return { error: err.message?.includes("check constraint") ? "One of those numbers looks out of range." : "Couldn't save your details. Try again." };
  }
}
