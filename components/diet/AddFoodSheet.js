"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { FOODS, findFood, scaleFood } from "@/lib/data/foods";
import { logExtraFood } from "@/lib/services/dietService";
import SearchSelect from "@/components/common/SearchSelect";

const FOOD_OPTIONS = FOODS.map((f) => ({ ...f, hint: `${f.proteinG} g protein · ${f.calories} kcal` }));
const field = "h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-base outline-none focus:border-emerald-500 dark:border-neutral-700";

// Log something eaten outside the plan (e.g. a protein lassi). Counts toward today's protein and
// calories; doesn't change "meals eaten" or the streak.
export default function AddFoodSheet({ dateKey, onClose, title = "Add something you ate", subtitle = "Not in your plan? Log it so today's totals stay right.", onSubmit }) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ name: "", serving: "", proteinG: "", calories: "", carbsG: "", fatG: "" });
  const [error, setError] = useState("");
  const [food, setFood] = useState(null); // the list food the numbers came from (rescaled with the amount)
  const fill = (f, serving) => setForm((x) => {
    const v = scaleFood(f, serving);
    return { ...x, serving, proteinG: String(v.proteinG), calories: String(v.calories), carbsG: String(v.carbsG), fatG: String(v.fatG) };
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const set = (k) => (e) => {
    const value = e.target.value;
    if (k === "serving" && food) return fill(food, value); // "30g" -> values for 30 g
    if (k !== "serving" && k !== "name") setFood(null); // typed their own numbers
    setForm((f) => ({ ...f, [k]: value }));
  };

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("What did you eat?");
    // Typed a common food without picking it: use its values.
    if (form.proteinG === "" && form.calories === "") {
      const match = findFood(form.name);
      if (match) {
        const v = scaleFood(match, form.serving || match.serving);
        setSaving(true);
        await (onSubmit ? onSubmit({ ...form, serving: form.serving || match.serving, ...v }) : logExtraFood(dateKey, { ...form, serving: form.serving || match.serving, ...v }));
        return onClose();
      }
    }
    if (form.proteinG === "" || form.calories === "") return setError("Add protein and calories (check the pack or a quick search).");
    setSaving(true);
    await (onSubmit ? onSubmit(form) : logExtraFood(dateKey, form));
    onClose();
  }

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
        className="animate-fade-up flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-white px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] [animation-duration:200ms] sm:rounded-3xl sm:p-6 dark:bg-neutral-900"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300 sm:hidden dark:bg-neutral-700" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-neutral-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 mb-1.5 block text-sm font-medium">What did you eat?</label>
        <SearchSelect
          options={FOOD_OPTIONS}
          value={form.name}
          placeholder="e.g. Protein lassi"
          onChange={(name) => {
            setForm((f) => ({ ...f, name }));
            // A common food typed in: show its values right away (unless they typed their own).
            const match = findFood(name);
            if (match && (food || form.proteinG === "")) {
              setFood(match);
              fill(match, form.serving || match.serving);
            }
          }}
          onSelect={(o) => {
            if (o.custom) {
              const match = findFood(o.name);
              setFood(match);
              setForm((f) => ({ ...f, name: o.name }));
              if (match) fill(match, form.serving || match.serving);
              return;
            }
            setFood(o);
            setForm((f) => ({ ...f, name: o.name }));
            fill(o, o.serving ?? "");
          }}
        />

        <label className="mt-4 mb-1.5 block text-sm font-medium">
          How much <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <input className={field} value={form.serving} onChange={set("serving")} placeholder="e.g. 1 glass (300 ml)" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Protein (g)</span>
            <input className={field} type="number" inputMode="decimal" min="0" step="0.1" value={form.proteinG} onChange={set("proteinG")} placeholder="15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Calories (kcal)</span>
            <input className={field} type="number" inputMode="numeric" min="0" value={form.calories} onChange={set("calories")} placeholder="220" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-neutral-500">Carbs (g)</span>
            <input className={field} type="number" inputMode="decimal" min="0" step="0.1" value={form.carbsG} onChange={set("carbsG")} placeholder="Optional" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-neutral-500">Fat (g)</span>
            <input className={field} type="number" inputMode="decimal" min="0" step="0.1" value={form.fatG} onChange={set("fatG")} placeholder="Optional" />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className="mt-5 h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white active:bg-emerald-700 disabled:opacity-50">
          {saving ? "Adding…" : "Add to today"}
        </button>
      </form>
    </div>,
    document.body,
  );
}
