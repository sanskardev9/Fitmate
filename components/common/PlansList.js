"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Dumbbell, Salad, CircleCheck, Copy, Archive, Trash2, Plus, ListChecks, X } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { getPreferences, setPreference } from "@/lib/services/preferencesService";
import { listWorkoutPlans, duplicateWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan } from "@/lib/services/workoutService";
import { listDietPlans, updateDietPlan, deleteDietPlan } from "@/lib/services/dietService";
import { useConfirm } from "./ConfirmDialog";
import PlanImport from "./PlanImport";

async function load() {
  const [prefs, workout, diet] = await Promise.all([getPreferences(), listWorkoutPlans(), listDietPlans()]);
  const withCounts = (plans, dayTable, itemTable) =>
    Promise.all(plans.map(async (p) => ({ ...p, days: await db.table(dayTable).where("planId").equals(p.id).count(), items: await db.table(itemTable).where("planId").equals(p.id).count() })));
  return { prefs, workout: await withCounts(workout, "trainingDays", "exercises"), diet: await withCounts(diet, "dietDays", "meals") };
}

export default function PlansList() {
  const data = useLiveQuery(load);
  const confirm = useConfirm();
  if (!data) return null;

  // Deleting the active plan hands "active" to the next remaining plan, if any.
  async function removeMany(kind, plans) {
    const isWorkout = kind === "workout";
    const ok = await confirm({
      title: plans.length === 1 ? `Delete "${plans[0].name}"?` : `Delete ${plans.length} ${kind} plans?`,
      message: `Their days and ${isWorkout ? "exercises" : "meals"} are removed. Workouts and meals you already logged are kept.`,
      confirmLabel: plans.length === 1 ? "Delete" : `Delete ${plans.length}`,
      tone: "danger",
    });
    if (!ok) return false;
    const ids = new Set(plans.map((p) => p.id));
    const pref = isWorkout ? "activeWorkoutPlanId" : "activeDietPlanId";
    if (ids.has(data.prefs[pref])) {
      const next = (isWorkout ? data.workout : data.diet).find((p) => !ids.has(p.id));
      await setPreference(pref, next?.id ?? null);
    }
    for (const p of plans) await (isWorkout ? deleteWorkoutPlan(p.id) : deleteDietPlan(p.id));
    return true;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section
        kind="workout"
        title="Workout plans"
        Icon={Dumbbell}
        plans={data.workout}
        itemLabel="exercises"
        activeId={data.prefs.activeWorkoutPlanId}
        onActivate={(id) => setPreference("activeWorkoutPlanId", id)}
        onDuplicate={(id) => duplicateWorkoutPlan(id)}
        onArchive={(id) => updateWorkoutPlan(id, { archived: true })}
        onDelete={(plans) => removeMany("workout", plans)}
      />
      <Section
        kind="diet"
        title="Diet plans"
        Icon={Salad}
        plans={data.diet}
        itemLabel="meals"
        activeId={data.prefs.activeDietPlanId}
        onActivate={(id) => setPreference("activeDietPlanId", id)}
        onArchive={(id) => updateDietPlan(id, { archived: true })}
        onDelete={(plans) => removeMany("diet", plans)}
      />
    </div>
  );
}

function Section({ kind, title, Icon, plans, itemLabel, activeId, onActivate, onDuplicate, onArchive, onDelete }) {
  const [selecting, setSelecting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState([]);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  return (
    <section className="animate-fade-up min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-xs text-neutral-500">{plans.length ? `${plans.length} plan${plans.length > 1 ? "s" : ""}` : "None yet"}</p>
          </div>
        </div>
        {plans.length > 1 &&
          (selecting ? (
            <button type="button" onClick={stopSelecting} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <X className="h-4 w-4" /> Cancel
            </button>
          ) : (
            <button type="button" onClick={() => setSelecting(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <ListChecks className="h-4 w-4" /> Select
            </button>
          ))}
      </div>

      {plans.length === 0 ? (
        <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 font-semibold text-white shadow-sm shadow-emerald-600/20 active:bg-emerald-700">
          <Plus className="h-5 w-5" /> Add {kind} plan
        </button>
      ) : (
        <>
          <ul className="space-y-2">
            {plans.map((p) => {
              const active = p.id === activeId;
              const isSelected = selected.includes(p.id);
              return (
                <li
                  key={p.id}
                  onClick={selecting ? () => toggle(p.id) : undefined}
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors sm:p-4 ${selecting ? "cursor-pointer" : ""} ${
                    isSelected ? "border-red-500/50 bg-red-500/5" : active ? "border-emerald-500/40 bg-emerald-500/5" : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  {selecting && (
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 ${isSelected ? "border-red-500 bg-red-500 text-white" : "border-neutral-300 dark:border-neutral-600"}`}>
                      {isSelected && <CircleCheck className="h-4 w-4" />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {active && <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active · </span>}
                      {p.days} day{p.days === 1 ? "" : "s"} · {p.items} {itemLabel}
                    </p>
                  </div>
                  {!selecting && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      {!active && <IconAction label="Set as active plan" Icon={CircleCheck} onClick={() => onActivate(p.id)} tone="good" />}
                      {onDuplicate && <IconAction label="Duplicate" Icon={Copy} onClick={() => onDuplicate(p.id)} />}
                      <IconAction label="Archive" Icon={Archive} onClick={() => onArchive(p.id)} />
                      <IconAction label="Delete" Icon={Trash2} onClick={() => onDelete([p])} tone="danger" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {selecting ? (
            <button
              type="button"
              disabled={!selected.length}
              onClick={async () => (await onDelete(plans.filter((p) => selected.includes(p.id)))) && stopSelecting()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" /> Delete {selected.length || ""} selected
            </button>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
              <Plus className="h-4 w-4" /> Add plan
            </button>
          )}
        </>
      )}
      {adding && <AddPlanSheet kind={kind} onClose={() => setAdding(false)} />}
    </section>
  );
}

// Bottom sheet with the three ways to add a plan.
// Rendered into <body> so animated (transformed) parents can't trap the fixed overlay.
function AddPlanSheet({ kind, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="animate-fade-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-3xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-300 sm:hidden dark:bg-neutral-700" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add a {kind} plan</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <PlanImport kind={kind} manualHref={`/plans/${kind}/new`} showGuide={false} />
      </div>
    </div>,
    document.body,
  );
}

function IconAction({ label, Icon, onClick, tone }) {
  const color = tone === "danger" ? "hover:bg-red-500/10 hover:text-red-600" : tone === "good" ? "text-emerald-600 hover:bg-emerald-500/10" : "hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 transition-colors ${color}`}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
    </button>
  );
}
