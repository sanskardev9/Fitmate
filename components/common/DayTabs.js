"use client";

import { useEffect, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS } from "@/lib/utils";

const label = (d, i) => (d.weekdays?.length ? d.weekdays.map((w) => WEEKDAYS[w]).join(" · ") : `Day ${i + 1}`);

// One day per page in the plan builders: a scrollable tab per day, plus a "+" to add one.
export function DayTabs({ days, active, onChange, onAdd, addLabel = "Add day" }) {
  const strip = useRef(null);
  useEffect(() => {
    strip.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <div className="sticky top-0 z-20 -mx-4 bg-[var(--background)]/90 px-4 py-2 backdrop-blur-lg md:mx-0 md:px-0">
      <div ref={strip} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {days.map((d, i) => {
          const on = i === active;
          return (
            <button
              key={d.key}
              data-i={i}
              type="button"
              onClick={() => onChange(i)}
              className={`flex shrink-0 flex-col items-start rounded-2xl border px-3.5 py-2 text-left transition-colors ${
                on ? "border-emerald-500 bg-emerald-500/10" : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
              }`}
            >
              <span className={`text-[11px] font-semibold tracking-wide uppercase ${on ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"}`}>{label(d, i)}</span>
              <span className="max-w-40 truncate text-sm font-medium">{d.name || `Day ${i + 1}`}</span>
            </button>
          );
        })}
        <button type="button" onClick={onAdd} aria-label={addLabel} title={addLabel} className="flex w-12 shrink-0 items-center justify-center rounded-2xl border border-dashed border-neutral-300 text-neutral-500 hover:border-emerald-500 hover:text-emerald-600 dark:border-neutral-700">
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// Previous / next day under the day's card.
export function DayPager({ days, active, onChange }) {
  if (days.length < 2) return null;
  const prev = active > 0 ? days[active - 1] : null;
  const next = active < days.length - 1 ? days[active + 1] : null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" disabled={!prev} onClick={() => onChange(active - 1)} className="flex min-w-0 items-center gap-2 rounded-2xl border border-neutral-200 px-3 py-3 text-left text-sm disabled:opacity-30 dark:border-neutral-800">
        <ChevronLeft className="h-5 w-5 shrink-0 text-neutral-400" />
        <span className="min-w-0 truncate">{prev ? prev.name || `Day ${active}` : "Previous"}</span>
      </button>
      <button type="button" disabled={!next} onClick={() => onChange(active + 1)} className="flex min-w-0 items-center justify-end gap-2 rounded-2xl border border-neutral-200 px-3 py-3 text-right text-sm font-medium disabled:opacity-30 dark:border-neutral-800">
        <span className="min-w-0 truncate">{next ? next.name || `Day ${active + 2}` : "Next"}</span>
        <ChevronRight className="h-5 w-5 shrink-0 text-emerald-600" />
      </button>
    </div>
  );
}
