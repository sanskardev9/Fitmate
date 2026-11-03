"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FOODS } from "@/lib/data/foods";
import { saveNewDietPlan, sumNutrition } from "@/lib/services/dietService";
import { setPreference } from "@/lib/services/preferencesService";
import { takeDraft } from "@/lib/import/draft";
import { uid } from "@/lib/utils";
import Card from "@/components/common/Card";
import UnitMenu from "@/components/common/UnitMenu";
import RecipeVideo from "./RecipeVideo";
import { youtubeId, checkVideos } from "@/lib/youtube";
import { DayTabs, DayPager } from "@/components/common/DayTabs";
import { Trash2 } from "lucide-react";
import BackLink from "@/components/common/BackLink";
import SearchSelect from "@/components/common/SearchSelect";
import WeekdayPicker from "@/components/common/WeekdayPicker";
import { inputClass, smallInputClass, primaryButton, secondaryButton, labelClass } from "@/components/common/ui";

const FOOD_OPTIONS = FOODS.map((f) => ({ ...f, hint: `${f.proteinG} g protein` }));
export const MEAL_SLOTS = ["Breakfast", "Lunch", "Snack", "Dinner"];
const MACROS = [
  ["calories", "kcal"],
  ["proteinG", "Protein"],
  ["carbsG", "Carbs"],
  ["fatG", "Fat"],
];

const newMeal = (slot = "Breakfast") => ({ key: uid(), slot, name: "", serving: "", calories: "", proteinG: "", carbsG: "", fatG: "", recipe: "", videoUrl: "", flags: [] });
const flagged = "ring-2 ring-amber-500/70";
const newDay = (n) => ({ key: uid(), name: n === 1 ? "Every day" : `Day ${n}`, weekdays: n === 1 ? [0, 1, 2, 3, 4, 5, 6] : [], meals: MEAL_SLOTS.map(newMeal) });

const toNum = (v) => (v === "" || v == null ? null : Number(v));

export default function DietPlanBuilder({ header }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [days, setDays] = useState([newDay(1)]);
  const [activeRaw, setActive] = useState(0);
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imported, setImported] = useState(null);

  useEffect(() => {
    const draft = takeDraft("diet");
    if (!draft) return;
    setName(draft.name ?? "");
    setDays(draft.days.map((d) => ({ key: uid(), name: d.name, weekdays: d.weekdays ?? [], meals: d.meals.map((m) => ({ ...newMeal(), ...m, key: uid() })) })));
    setImported(draft.source ?? "PDF");
    // AI links are often invented: keep only videos YouTube confirms exist.
    const links = draft.days.flatMap((d) => d.meals.map((m) => m.videoUrl)).filter(Boolean);
    if (links.length)
      checkVideos(links).then((valid) => {
        let dropped = 0;
        setDays((ds) =>
          ds.map((d) => ({
            ...d,
            meals: d.meals.map((m) => {
              if (!m.videoUrl || valid.has(youtubeId(m.videoUrl))) return m;
              dropped++;
              return { ...m, videoUrl: "" };
            }),
          })),
        );
        setVideoNote({ kept: links.length - dropped, dropped });
      });
  }, []);
  const [videoNote, setVideoNote] = useState(null);

  const flagCount = days.reduce((n, d) => n + d.meals.filter((m) => m.flags.length).length, 0);

  const updateDay = (key, changes) => setDays((ds) => ds.map((d) => (d.key === key ? { ...d, ...changes } : d)));
  // Editing a field counts as reviewing it, so its flag clears.
  const updateMeal = (dayKey, mealKey, changes) =>
    setDays((ds) =>
      ds.map((d) =>
        d.key === dayKey
          ? { ...d, meals: d.meals.map((m) => (m.key === mealKey ? { ...m, ...changes, flags: m.flags.filter((f) => !(f in changes)) } : m)) }
          : d,
      ),
    );

  async function save() {
    const cleaned = days.map((d) => ({ ...d, meals: d.meals.filter((m) => m.name.trim()) }));
    if (!name.trim()) return setError("Give your plan a name.");
    if (cleaned.every((d) => d.meals.length === 0)) return setError("Add at least one meal.");
    setSaving(true);
    const plan = await saveNewDietPlan({
      name: name.trim(),
      days: cleaned.map((d) => ({
        name: d.name.trim() || "Day",
        weekdays: d.weekdays,
        meals: d.meals.map((m) => ({
          slot: m.slot,
          name: m.name.trim(),
          serving: m.serving.trim(),
          calories: toNum(m.calories),
          proteinG: toNum(m.proteinG),
          carbsG: toNum(m.carbsG),
          fatG: toNum(m.fatG),
          recipe: m.recipe.trim(),
          videoUrl: youtubeId(m.videoUrl) ? m.videoUrl.trim() : "",
        })),
      })),
    });
    await setPreference("activeDietPlanId", plan.id);
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
              ? `${flagCount} meal${flagCount > 1 ? "s have" : " has"} missing or estimated macros, outlined in amber. Editing a value marks it as checked.`
              : "Everything was read clearly. Give it a quick look anyway."}
          </p>
          {videoNote && (
            <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
              Recipe videos: {videoNote.kept} checked and kept{videoNote.dropped ? `, ${videoNote.dropped} broken link${videoNote.dropped > 1 ? "s" : ""} removed (those meals get a YouTube search instead)` : ""}.
            </p>
          )}
        </div>
      )}
      <Card>
        <label className={labelClass}>Plan name</label>
        <input className={inputClass} placeholder="e.g. Lean Bulk – 140 g protein" value={name} onChange={(e) => setName(e.target.value)} />
      </Card>

      <DayTabs days={days} active={active} onChange={setActive} addLabel="Add a different day" onAdd={() => {
        setDays((ds) => [...ds, { ...newDay(ds.length + 1) }]);
        setActive(days.length);
      }} />

      {days.map((day, dayIndex) => {
        if (dayIndex !== active) return null;
        const totals = sumNutrition(day.meals.map((m) => ({ calories: toNum(m.calories), proteinG: toNum(m.proteinG), carbsG: toNum(m.carbsG), fatG: toNum(m.fatG) })));
        return (
          <Card key={day.key}>
            <div className="mb-3 flex items-center gap-2">
              <input className={inputClass} value={day.name} onChange={(e) => updateDay(day.key, { name: e.target.value })} />
              {days.length > 1 && (
                <IconBtn label="Delete this day" danger onClick={() => setDays((ds) => ds.filter((d) => d.key !== day.key))}>
                  <Trash2 className="h-[18px] w-[18px]" />
                </IconBtn>
              )}
            </div>
            <label className={labelClass}>Follow on</label>
            <WeekdayPicker value={day.weekdays} onChange={(weekdays) => updateDay(day.key, { weekdays })} />

            <p className="mt-3 text-sm text-neutral-500">
              Day total: <b className="text-neutral-900 dark:text-neutral-100">{Math.round(totals.proteinG)} g protein</b> · {Math.round(totals.calories)} kcal · {Math.round(totals.carbsG)} g carbs · {Math.round(totals.fatG)} g fat
            </p>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {day.meals.map((meal) => (
                <div key={meal.key} className={`rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950 ${meal.flags.length ? "border border-amber-500/40" : ""}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <UnitMenu
                      value={meal.slot}
                      options={MEAL_SLOTS.map((s) => [s, s])}
                      onChange={(slot) => updateMeal(day.key, meal.key, { slot })}
                      lowercase={false}
                      align="left"
                      buttonClassName="flex items-center gap-1 rounded-lg px-2 py-1 -ml-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                    />
                    <IconBtn label="Remove meal" danger onClick={() => updateDay(day.key, { meals: day.meals.filter((m) => m.key !== meal.key) })}>
                      <Trash2 className="h-[18px] w-[18px]" />
                    </IconBtn>
                  </div>
                  <SearchSelect
                    options={FOOD_OPTIONS}
                    value={meal.name}
                    onChange={(text) => updateMeal(day.key, meal.key, { name: text })}
                    placeholder="Search foods or type a meal…"
                    onSelect={(opt) =>
                      updateMeal(
                        day.key,
                        meal.key,
                        opt.custom
                          ? { name: opt.name }
                          : { name: opt.name, serving: opt.serving, calories: opt.calories, proteinG: opt.proteinG, carbsG: opt.carbsG, fatG: opt.fatG },
                      )
                    }
                  />
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {MACROS.map(([field, label]) => (
                      <label key={field}>
                        <span className={labelClass}>{label}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          className={`${smallInputClass} ${meal.flags.includes(field) ? flagged : ""}`}
                          value={meal[field]}
                          onChange={(e) => updateMeal(day.key, meal.key, { [field]: e.target.value })}
                        />
                      </label>
                    ))}
                  </div>
                  <input className={`${inputClass} mt-2 py-1.5 text-sm`} placeholder="Serving / quantity (e.g. 200 g)" value={meal.serving} onChange={(e) => updateMeal(day.key, meal.key, { serving: e.target.value })} />
                  <textarea className={`${inputClass} mt-2 py-1.5 text-sm`} rows={2} placeholder="Recipe / ingredients (optional)" value={meal.recipe} onChange={(e) => updateMeal(day.key, meal.key, { recipe: e.target.value })} />
                  <input className={`${inputClass} mt-2 py-1.5 text-sm`} inputMode="url" placeholder="YouTube recipe link (optional)" value={meal.videoUrl ?? ""} onChange={(e) => updateMeal(day.key, meal.key, { videoUrl: e.target.value })} />
                  {youtubeId(meal.videoUrl) && (
                    <div className="mt-2">
                      <RecipeVideo url={meal.videoUrl} dish={meal.name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className={`${secondaryButton} mt-3 w-full`} onClick={() => updateDay(day.key, { meals: [...day.meals, newMeal("Snack")] })}>
              + Add meal
            </button>
          </Card>
        );
      })}

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
