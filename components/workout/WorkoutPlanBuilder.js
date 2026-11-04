"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EXERCISES, EXERCISE_CATEGORIES, exerciseDefaults, inferType } from "@/lib/data/exercises";
import { saveNewWorkoutPlan } from "@/lib/services/workoutService";
import { loadCatalog, contributeExercises } from "@/lib/services/exerciseCatalog";
import { getPreferences, setPreference } from "@/lib/services/preferencesService";
import { takeDraft } from "@/lib/import/draft";
import { uid } from "@/lib/utils";
import Card from "@/components/common/Card";
import UnitMenu from "@/components/common/UnitMenu";
import { DayTabs, DayPager } from "@/components/common/DayTabs";
import { SECTIONS, SECTION_LABEL } from "@/lib/workout/sections";
import { Fragment } from "react";
import Segmented from "@/components/common/Segmented";
import DayPreview from "./DayPreview";
import { Copy, Trash2, GripVertical } from "lucide-react";
import { useDragReorder } from "@/components/common/useDragReorder";
import BackLink from "@/components/common/BackLink";
import SearchSelect from "@/components/common/SearchSelect";
import WeekdayPicker from "@/components/common/WeekdayPicker";
import { inputClass, smallInputClass, primaryButton, secondaryButton, labelClass } from "@/components/common/ui";

const BUILT_IN = new Set(EXERCISES.map((ex) => ex.name.toLowerCase()));
const EXERCISE_OPTIONS = EXERCISES.map((ex) => ({ ...ex, hint: EXERCISE_CATEGORIES[ex.category].label }));
const TARGET_UNITS = [
  ["reps", "Reps"],
  ["sec", "Sec"],
  ["min", "Min"],
];
const REST_UNITS = [
  ["sec", "Sec"],
  ["min", "Min"],
];
const WEIGHT_UNITS = [
  ["kg", "kg"],
  ["lb", "lb"],
];
const FLAG_HELP = { name: "name", sets: "sets", target: "target", unit: "reps vs time", rest: "rest" };
const flagged = "ring-2 ring-amber-500/70";

const toNum = (v) => (v === "" || v == null ? null : Number(v));
const round = (n) => Math.round(n * 100) / 100;

const newExercise = () => ({
  key: uid(),
  name: "",
  unit: "reps",
  sets: 3,
  target: 8,
  restValue: 90,
  restUnit: "sec",
  weight: "",
  weightUnit: "kg",
  notes: "",
  section: "main",
  alternatives: [],
  flags: [],
});
const newDay = (n) => ({ key: uid(), name: `Day ${n}`, weekdays: [], exercises: [newExercise()] });

// Parsed PDF exercise ({ type, reps, holdSec, restSec, weightKg, flags }) -> editor state.
function fromParsed(ex) {
  const flagMap = { name: "name", sets: "sets", reps: "target", holdSec: "target", type: "unit", restSec: "rest" };
  return {
    ...newExercise(),
    name: ex.name,
    unit: ex.type === "hold" ? "sec" : "reps",
    sets: ex.sets,
    target: ex.type === "hold" ? ex.holdSec : ex.reps,
    restValue: ex.restSec,
    weight: ex.weightKg ?? "",
    notes: ex.notes ?? "",
    section: ex.section ?? "main",
    alternatives: ex.alternatives ?? [],
    flags: [...new Set((ex.flags ?? []).map((f) => flagMap[f]).filter(Boolean))],
  };
}

export default function WorkoutPlanBuilder({ header }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [days, setDays] = useState([newDay(1)]);
  const [activeRaw, setActive] = useState(0);
  const [view, setView] = useState("edit");
  const active = Math.min(activeRaw, days.length - 1);
  const goTo = (i) => {
    setActive(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [dirty, setDirty] = useState(false);
  const [touchedOnce, setTouchedOnce] = useState(false);

  // Any edit (or an imported draft) after the first render counts as unsaved work.
  useEffect(() => {
    if (touchedOnce) setDirty(true);
    else setTouchedOnce(true);
  }, [name, days]); // eslint-disable-line react-hooks/exhaustive-deps
  const [imported, setImported] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Unsaved work is autosaved (synced preference) so a reload never empties the form.
  const [restored, setRestored] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    // Run once (React dev mode runs effects twice): an imported plan must never be replaced by the autosave.
    if (loaded.current) return;
    loaded.current = true;
    const draft = takeDraft("workout");
    if (draft) {
      setName(draft.name ?? "");
      setDays(draft.days.map((d) => ({ key: uid(), name: d.name, weekdays: d.weekdays ?? [], exercises: d.exercises.map(fromParsed) })));
      setImported(draft.source ?? "PDF");
      setRestored(true);
      return;
    }
    getPreferences().then((prefs) => {
      const saved = prefs.workoutBuilderDraft;
      if (saved?.days?.length) {
        setName(saved.name ?? "");
        setDays(saved.days);
        if (saved.imported) setImported(saved.imported);
      }
      setRestored(true);
    });
  }, []);
  useEffect(() => {
    if (!restored) return;
    const t = setTimeout(() => setPreference("workoutBuilderDraft", { name, days, imported }), 600);
    return () => clearTimeout(t);
  }, [restored, name, days, imported]);

  const [catalog, setCatalog] = useState([]);
  useEffect(() => {
    loadCatalog().then((list) => {
      const extra = list.filter((c) => !BUILT_IN.has(c.name.toLowerCase()));
      setCatalog(extra.map((c) => ({ name: c.name, type: c.type, hint: "Added by FitMate users", fromCatalog: true })));
      const known = new Set(extra.map((c) => c.name.toLowerCase()));
      setDays((ds) => ds.map((d) => ({ ...d, exercises: d.exercises.map((e) => (e.flags.includes("name") && known.has(e.name.trim().toLowerCase()) ? { ...e, flags: e.flags.filter((x) => x !== "name") } : e)) })));
    });
  }, []);
  const exerciseOptions = catalog.length ? [...EXERCISE_OPTIONS, ...catalog] : EXERCISE_OPTIONS;

  const flagCount = days.reduce((n, d) => n + d.exercises.filter((e) => e.flags.length).length, 0);

  const updateDay = (key, changes) => setDays((ds) => ds.map((d) => (d.key === key ? { ...d, ...changes } : d)));
  // Editing a field counts as reviewing it, so its flag clears.
  const updateExercise = (dayKey, exKey, changes, reviewed = []) =>
    setDays((ds) =>
      ds.map((d) =>
        d.key === dayKey
          ? { ...d, exercises: d.exercises.map((e) => (e.key === exKey ? { ...e, ...changes, flags: e.flags.filter((f) => !reviewed.includes(f)) } : e)) }
          : d,
      ),
    );

  // Hold the grip and drag to reorder exercises within the day on screen.
  const reorder = useDragReorder((from, to) =>
    setDays((ds) =>
      ds.map((d, i) => {
        if (i !== active) return d;
        const list = [...d.exercises];
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        return { ...d, exercises: list };
      }),
    ),
  );

  function changeTargetUnit(day, ex, unit) {
    let target = ex.target;
    const t = toNum(target);
    if (t != null && ex.unit === "sec" && unit === "min") target = round(t / 60);
    if (t != null && ex.unit === "min" && unit === "sec") target = Math.round(t * 60);
    updateExercise(day.key, ex.key, { unit, target }, ["unit", "target"]);
  }

  function changeRestUnit(day, ex, restUnit) {
    const r = toNum(ex.restValue);
    let restValue = ex.restValue;
    if (r != null && ex.restUnit === "sec" && restUnit === "min") restValue = round(r / 60);
    if (r != null && ex.restUnit === "min" && restUnit === "sec") restValue = Math.round(r * 60);
    updateExercise(day.key, ex.key, { restUnit, restValue }, ["rest"]);
  }

  function pickExercise(day, ex, opt) {
    if (opt.fromCatalog) return updateExercise(day.key, ex.key, { name: opt.name, unit: opt.type === "hold" ? "sec" : "reps" }, ["name", "unit"]);
    if (opt.custom) {
      const type = inferType(opt.name);
      return updateExercise(day.key, ex.key, { name: opt.name, ...(type && { unit: type === "hold" ? "sec" : "reps" }) }, ["name"]);
    }
    const { type, restSec } = exerciseDefaults(opt);
    updateExercise(day.key, ex.key, { name: opt.name, unit: type === "hold" ? "sec" : "reps", restValue: restSec, restUnit: "sec" }, ["name", "unit"]);
  }

  function typeName(day, ex, text) {
    // Free typing keeps the name; a clear movement word ("push-up", "row") also fixes the unit.
    const type = inferType(text);
    const unit = type === "reps" ? "reps" : type === "hold" && ex.unit === "reps" ? "sec" : ex.unit;
    updateExercise(day.key, ex.key, { name: text, unit }, ["name"]);
  }

  async function save() {
    const cleaned = days.map((d) => ({ ...d, exercises: d.exercises.filter((e) => e.name.trim()) }));
    if (!name.trim()) return setError("Give your plan a name.");
    if (cleaned.every((d) => d.exercises.length === 0)) return setError("Add at least one exercise.");
    setSaving(true);
    const plan = await saveNewWorkoutPlan({
      name: name.trim(),
      days: cleaned.map((d) => ({
        name: d.name.trim() || "Workout",
        weekdays: d.weekdays,
        exercises: d.exercises.map((e) => {
          const target = toNum(e.target);
          const rest = toNum(e.restValue) ?? 90;
          return {
            name: e.name.trim(),
            type: e.unit === "reps" ? "reps" : "hold",
            sets: toNum(e.sets) ?? 1,
            reps: e.unit === "reps" ? target : null,
            holdSec: e.unit === "reps" || target == null ? null : e.unit === "min" ? Math.round(target * 60) : target,
            targetUnit: e.unit,
            restSec: e.restUnit === "min" ? Math.round(rest * 60) : rest,
            restUnit: e.restUnit,
            weight: toNum(e.weight),
            weightUnit: e.weightUnit,
            notes: e.notes.trim(),
            section: e.section ?? "main",
            alternatives: e.alternatives ?? [],
          };
        }),
      })),
    });
    await setPreference("activeWorkoutPlanId", plan.id);
    await setPreference("workoutBuilderDraft", null);
    contributeExercises(cleaned.flatMap((d) => d.exercises.map((e) => ({ name: e.name.trim(), type: e.unit === "reps" ? "reps" : "hold" }))));
    const back = new URLSearchParams(window.location.search).get("return");
    router.push(back?.startsWith("/") ? back : "/home");
  }

  return (
    <>
    <BackLink dirty={dirty && !saving} />
    {header}
    <div className="space-y-3">
      {imported && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-300">Imported from {imported}. Review before saving.</p>
          <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
            {flagCount
              ? `${flagCount} exercise${flagCount > 1 ? "s have" : " has"} values we weren't sure about, outlined in amber. Editing a field marks it as checked.`
              : "Everything was read clearly. Give it a quick look anyway."}
          </p>
        </div>
      )}

      <Card>
        <label className={labelClass}>Plan name</label>
        <input className={inputClass} placeholder="e.g. Calisthenics Strength" value={name} onChange={(e) => setName(e.target.value)} />
      </Card>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-neutral-500">{days.length} day{days.length === 1 ? "" : "s"}</span>
        <Segmented options={[["edit", "Edit"], ["preview", "Preview"]]} value={view} onChange={setView} />
      </div>

      <DayTabs days={days} active={active} onChange={setActive} addLabel="Add training day" onAdd={() => {
        setDays((ds) => [...ds, newDay(ds.length + 1)]);
        setActive(days.length);
      }} />

      {view === "preview" && <DayPreview day={days[active]} />}

      {days.map((day, dayIndex) => dayIndex !== active || view === "preview" ? null : (
        <Card key={day.key}>
          <div className="mb-3 flex items-center gap-2">
            <input className={inputClass} value={day.name} onChange={(e) => updateDay(day.key, { name: e.target.value })} />
            <IconBtn label="Copy this day" onClick={() => {
              setDays((ds) => [...ds, { ...day, key: uid(), name: `${day.name} copy`, weekdays: [], exercises: day.exercises.map((e) => ({ ...e, key: uid() })) }]);
              setActive(days.length);
            }}>
              <Copy className="h-[18px] w-[18px]" />
            </IconBtn>
            {days.length > 1 && (
              <IconBtn label="Delete this day" danger onClick={() => setDays((ds) => ds.filter((d) => d.key !== day.key))}>
                <Trash2 className="h-[18px] w-[18px]" />
              </IconBtn>
            )}
          </div>
          <label className={labelClass}>Repeat on</label>
          <WeekdayPicker value={day.weekdays} onChange={(weekdays) => updateDay(day.key, { weekdays })} />

          <div className="mt-4 space-y-3">
            {day.exercises.map((ex, i) => (
              <Fragment key={ex.key}>
              {!reorder.collapsed && (i === 0 || (day.exercises[i - 1].section ?? "main") !== (ex.section ?? "main")) && (
                <p className={`flex items-center gap-2 pt-1 text-xs font-semibold tracking-wide uppercase ${(ex.section ?? "main") === "main" ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400"}`}>
                  {SECTION_LABEL[ex.section ?? "main"]}
                  <span className="h-px flex-1 bg-current opacity-20" />
                </p>
              )}
              <div
                {...reorder.itemProps(i)}
                className={`rounded-xl bg-neutral-50 p-3 transition-shadow dark:bg-neutral-950 ${ex.flags.length ? "border border-amber-500/40" : ""} ${(ex.section ?? "main") !== "main" ? "bg-sky-500/5 dark:bg-sky-500/5" : ""} ${reorder.collapsed ? "py-1.5" : ""} ${reorder.dragging === i ? "shadow-2xl ring-2 ring-emerald-500" : ""}`}
              >
                <div className={`${reorder.collapsed ? "" : "mb-2 "}flex items-center justify-between gap-2`}>
                  <button
                    type="button"
                    {...reorder.handleProps(i)}
                    aria-label="Hold and drag to reorder"
                    title="Hold and drag to reorder"
                    className="-ml-1.5 flex h-9 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-200 active:cursor-grabbing dark:hover:bg-neutral-800"
                  >
                    <GripVertical className="h-5 w-5" />
                  </button>
                  {reorder.collapsed ? (
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      <span className="mr-2 text-xs text-neutral-500 tabular-nums">{i + 1}</span>
                      {ex.name || "Untitled exercise"}
                    </span>
                  ) : (
                  <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-neutral-200 px-1.5 text-xs font-semibold text-neutral-600 tabular-nums dark:bg-neutral-800 dark:text-neutral-300">{i + 1}</span>
                  )}
                  {!reorder.collapsed && (
                    <UnitMenu
                      align="left"
                      className="mr-auto"
                      value={ex.section ?? "main"}
                      options={SECTIONS}
                      lowercase={false}
                      onChange={(section) => updateExercise(day.key, ex.key, { section })}
                      buttonClassName={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${(ex.section ?? "main") === "main" ? "text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400" : "text-sky-700 hover:bg-sky-500/10 dark:text-sky-400"}`}
                    />
                  )}
                  {!reorder.collapsed && <div className="-mr-2 flex">
                    <IconBtn label="Remove exercise" danger onClick={() => updateDay(day.key, { exercises: day.exercises.filter((e) => e.key !== ex.key) })}>
                      <Trash2 className="h-[18px] w-[18px]" />
                    </IconBtn>
                  </div>}
                </div>

                {!reorder.collapsed && ex.flags.length > 0 && (
                  <p className="-mt-1 mb-2 text-xs text-amber-600 dark:text-amber-400">Check: {ex.flags.map((f) => FLAG_HELP[f]).join(", ")}</p>
                )}
                {!reorder.collapsed && (<>
                <SearchSelect
                  options={exerciseOptions}
                  value={ex.name}
                  placeholder="Search exercises or type your own…"
                  className={ex.flags.includes("name") ? flagged : ""}
                  onChange={(text) => typeName(day, ex, text)}
                  onSelect={(opt) => pickExercise(day, ex, opt)}
                />

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Sets">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      className={`${smallInputClass} ${ex.flags.includes("sets") ? flagged : ""}`}
                      value={ex.sets}
                      onChange={(e) => updateExercise(day.key, ex.key, { sets: e.target.value }, ["sets"])}
                    />
                  </Field>
                  <Field label="Target">
                    <UnitInput
                      value={ex.target ?? ""}
                      step={ex.unit === "min" ? "0.5" : "1"}
                      onChange={(v) => updateExercise(day.key, ex.key, { target: v }, ["target"])}
                      unit={ex.unit}
                      units={TARGET_UNITS}
                      onUnit={(u) => changeTargetUnit(day, ex, u)}
                      flaggedValue={ex.flags.includes("target")}
                      flaggedUnit={ex.flags.includes("unit")}
                    />
                  </Field>
                  <Field label="Rest">
                    <UnitInput
                      value={ex.restValue ?? ""}
                      step={ex.restUnit === "min" ? "0.5" : "15"}
                      onChange={(v) => updateExercise(day.key, ex.key, { restValue: v }, ["rest"])}
                      unit={ex.restUnit}
                      units={REST_UNITS}
                      onUnit={(u) => changeRestUnit(day, ex, u)}
                      flaggedValue={ex.flags.includes("rest")}
                    />
                  </Field>
                  <Field label="Weight">
                    <UnitInput
                      value={ex.weight}
                      placeholder="–"
                      onChange={(v) => updateExercise(day.key, ex.key, { weight: v })}
                      unit={ex.weightUnit}
                      units={WEIGHT_UNITS}
                      onUnit={(u) => updateExercise(day.key, ex.key, { weightUnit: u })}
                    />
                  </Field>
                </div>

                <textarea
                  rows={2}
                  className={`${inputClass} mt-3 resize-none py-1.5 text-sm leading-snug`}
                  placeholder="Notes (optional)"
                  value={ex.notes}
                  onChange={(e) => updateExercise(day.key, ex.key, { notes: e.target.value })}
                />
                </>)}
              </div>
              </Fragment>
            ))}
            <button type="button" className={`${secondaryButton} w-full`} onClick={() => updateDay(day.key, { exercises: [...day.exercises, newExercise()] })}>
              + Add exercise
            </button>
          </div>
        </Card>
      ))}

      <DayPager days={days} active={active} onChange={goTo} />

      {/* Save stays pinned above the phone tab bar, so it is reachable however long the plan gets. */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 -mx-4 border-t border-neutral-200 bg-[var(--background)]/90 px-4 py-3 backdrop-blur-lg md:bottom-0 md:mx-0 md:rounded-2xl md:border md:px-4 dark:border-neutral-800">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <button type="button" disabled={saving} onClick={save} className={`${primaryButton} w-full`}>
          {saving ? "Saving…" : "Save plan"}
        </button>
      </div>
    </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      {children}
    </div>
  );
}

// Number with its unit inside the same box: [ 8 | reps ▾ ], using the app's own dropdown.
function UnitInput({ value, onChange, unit, units, onUnit, step = "1", placeholder, flaggedValue, flaggedUnit }) {
  return (
    <div
      className={`flex h-11 w-full min-w-0 items-stretch rounded-lg border border-neutral-300 bg-white focus-within:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 ${flaggedValue || flaggedUnit ? flagged : ""}`}
    >
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 flex-1 bg-transparent px-2 text-center text-base outline-none"
      />
      <UnitMenu value={unit} options={units} onChange={onUnit} />
    </div>
  );
}

function IconBtn({ label, onClick, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-500 transition-colors ${danger ? "hover:bg-red-500/10 hover:text-red-600" : "hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"}`}
    >
      {children}
    </button>
  );
}
