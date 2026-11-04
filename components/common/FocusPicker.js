"use client";

import { Check } from "lucide-react";
import { FOCUSES, COVERED_BY_GOAL } from "@/lib/focuses";

// "Also want to…" multi-select. Shapes the training plan; doesn't change calories.
export default function FocusPicker({ goal, value = [], onChange, label = true }) {
  const hidden = COVERED_BY_GOAL[goal];
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div>
      {label && (
        <>
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Also want to <span className="font-normal tracking-normal normal-case">(optional, pick any)</span>
          </span>
          <p className="-mt-0.5 mb-2 text-sm text-neutral-500">Added to your training plan. Your calories still follow your main goal.</p>
        </>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {FOCUSES.filter((f) => f.id !== hidden).map((f) => {
          const on = value.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(f.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${on ? "border-emerald-500 bg-emerald-500/5" : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"}`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 dark:border-neutral-600"}`}>
                {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{f.label}</span>
                <span className="block text-xs text-neutral-500">{f.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
