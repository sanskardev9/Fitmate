"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, displayName } from "@/components/auth/AuthProvider";
import { cachedProfile, fetchProfile, saveProfile, suggestTargets } from "@/lib/services/profileService";
import { inputClass, primaryButton, labelClass } from "@/components/common/ui";

// Optional calorie/protein calculator. Never required: by default targets come from the diet plan.
export const GOALS = [
  ["lose_fat", "Lose fat"],
  ["recomposition", "Build muscle & lose fat"],
  ["build_muscle", "Build muscle"],
  ["maintain", "Maintain"],
];

const blank = (v) => v === "" || v == null;
const numOrNull = (v) => (blank(v) ? null : Number(v));

export default function TargetsForm({ onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const fill = (p) =>
      setForm({
        gender: p?.gender ?? "",
        date_of_birth: p?.date_of_birth ?? "",
        height_cm: p?.height_cm ?? "",
        weight_kg: p?.weight_kg ?? "",
        target_weight_kg: p?.target_weight_kg ?? "",
        goal: p?.goal ?? "",
        training_days_per_week: p?.training_days_per_week ?? 4,
        full_name: p?.full_name ?? displayName(user),
      });
    fill(cachedProfile(user.id));
    fetchProfile(user.id).then((p) => p && fill(p)).catch(() => {});
  }, [user]);

  const s = useMemo(() => (form ? suggestTargets(form) : {}), [form]);
  if (!form) return null;
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const ready = s.calories_target != null;

  let why = "Fill in the fields above and your targets appear here.";
  if (s.maintenance) {
    const base = `You burn about ${s.maintenance.toLocaleString()} kcal a day.`;
    if (s.direction) why = `${base} ${s.adjust < 0 ? `${-s.adjust} kcal less` : `${s.adjust} kcal more`} takes you from ${form.weight_kg} to ${form.target_weight_kg} kg in about ${s.weeks} weeks.`;
    else if (s.adjust < 0) why = `${base} ${-s.adjust} kcal less loses fat while protein protects muscle.`;
    else if (s.adjust > 0) why = `${base} ${s.adjust} kcal more gives muscle room to grow.`;
    else why = `${base} That's your target.`;
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await saveProfile(user.id, {
        full_name: String(form.full_name || "Athlete").trim(),
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        height_cm: numOrNull(form.height_cm),
        weight_kg: numOrNull(form.weight_kg),
        target_weight_kg: numOrNull(form.target_weight_kg),
        goal: form.goal || null,
        training_days_per_week: numOrNull(form.training_days_per_week),
        protein_target_g: s.protein_target_g ?? null,
        calories_target: s.calories_target ?? null,
      });
      onSaved?.();
    } catch (err) {
      setError(err.message?.includes("check constraint") ? "One of the values is out of range." : err.message || "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GOALS.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => set("goal")(v)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${form.goal === v ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-neutral-300 hover:border-emerald-500/50 dark:border-neutral-700"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label>
          <span className={labelClass}>Gender</span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ["male", "Male"],
              ["female", "Female"],
            ].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set("gender")(v)} className={`rounded-lg border py-2.5 text-sm ${form.gender === v ? "border-emerald-500 bg-emerald-500/10" : "border-neutral-300 dark:border-neutral-700"}`}>
                {l}
              </button>
            ))}
          </div>
        </label>
        <Num label="Date of birth" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
        <Num label="Height (cm)" value={form.height_cm} onChange={set("height_cm")} placeholder="170" />
        <Num label="Weight (kg)" value={form.weight_kg} onChange={set("weight_kg")} placeholder="70" step="0.1" />
        <Num label="Target weight (kg)" value={form.target_weight_kg} onChange={set("target_weight_kg")} placeholder="Optional" step="0.1" />
        <Num label="Training days / week" value={form.training_days_per_week} onChange={set("training_days_per_week")} min="0" max="7" />
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Calories" value={s.calories_target} unit="kcal" />
          <Stat label="Protein" value={s.protein_target_g} unit="g" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{why}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="button" onClick={save} disabled={!ready || saving} className={`${primaryButton} w-full`}>
        {saving ? "Saving…" : "Use these targets"}
      </button>
    </div>
  );
}

function Num({ label, value, onChange, type = "number", ...props }) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        className={`${inputClass} py-2`}
        value={value ?? ""}
        max={type === "date" ? new Date().toISOString().slice(0, 10) : props.max}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums">
        {value != null ? value.toLocaleString() : "–"} <span className="text-sm font-normal text-neutral-500">{unit}</span>
      </p>
    </div>
  );
}
