"use client";

import { useState } from "react";
import { Timer, Weight } from "lucide-react";
import { SECTION_LABEL } from "@/lib/workout/sections";
import { FormVideoButton, FormVideo } from "./FormVideo";
import { WEEKDAYS } from "@/lib/utils";

const fmtRest = (v, unit) => (v === "" || v == null ? null : unit === "min" ? `${v} min` : Number(v) >= 60 && Number(v) % 30 === 0 ? `${Number(v) / 60} min` : `${v}s`);
const fmtTarget = (e) => (e.target === "" || e.target == null ? "–" : e.unit === "reps" ? `${e.target} reps` : e.unit === "min" ? `${e.target} min` : `${e.target}s`);

// Read-only look at one day of the plan as it will feel in the gym.
export default function DayPreview({ day }) {
  const [formOpen, setFormOpen] = useState(null);
  const items = day.exercises.filter((e) => e.name.trim());
  const groups = [];
  for (const e of items) {
    const sec = e.section ?? "main";
    if (!groups.length || groups.at(-1).section !== sec) groups.push({ section: sec, items: [] });
    groups.at(-1).items.push(e);
  }
  const mainSets = items.filter((e) => (e.section ?? "main") === "main").reduce((n, e) => n + (Number(e.sets) || 0), 0);
  // Rough time: each set ~40s of work plus its rest.
  const minutes = Math.round(items.reduce((n, e) => n + (Number(e.sets) || 0) * (40 + (e.restUnit === "min" ? Number(e.restValue) * 60 : Number(e.restValue) || 0)), 0) / 60);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">{day.weekdays?.length ? day.weekdays.map((w) => WEEKDAYS[w]).join(" · ") : "No day set"}</p>
      <h2 className="mt-1 text-xl font-semibold break-words">{day.name || "Untitled day"}</h2>
      <p className="mt-1 text-sm text-neutral-500">
        {items.length} exercises · {mainSets} working sets · about {minutes} min
      </p>

      {items.length === 0 && <p className="mt-6 text-sm text-neutral-500">No exercises yet. Switch to Edit to add some.</p>}

      <div className="mt-5 space-y-5">
        {groups.map((g, gi) => (
          <section key={gi}>
            <p className={`mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase ${g.section === "main" ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400"}`}>
              {SECTION_LABEL[g.section]}
              <span className="h-px flex-1 bg-current opacity-20" />
            </p>
            <ol className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {g.items.map((e) => (
                <li key={e.key} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-medium break-words">{e.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-lg bg-neutral-100 px-2 py-1 text-sm font-semibold tabular-nums dark:bg-neutral-800">
                        {e.sets || "–"} × {fmtTarget(e)}
                      </span>
                      <FormVideoButton open={formOpen === e.key} onToggle={() => setFormOpen((v) => (v === e.key ? null : e.key))} />
                    </span>
                  </div>
                  {formOpen === e.key && <FormVideo name={e.name} />}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                    {fmtRest(e.restValue, e.restUnit) && (
                      <span className="flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" /> Rest {fmtRest(e.restValue, e.restUnit)}
                      </span>
                    )}
                    {e.weight !== "" && e.weight != null && (
                      <span className="flex items-center gap-1">
                        <Weight className="h-3.5 w-3.5" /> {e.weight} {e.weightUnit}
                      </span>
                    )}
                  </div>
                  {e.notes?.trim() && <p className="mt-1.5 text-sm leading-snug text-neutral-600 dark:text-neutral-400">{e.notes}</p>}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
