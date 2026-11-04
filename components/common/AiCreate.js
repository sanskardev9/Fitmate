"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Copy, Check, X, Plus } from "lucide-react";
import { useAuth, displayName } from "@/components/auth/AuthProvider";
import { cachedProfile } from "@/lib/services/profileService";
import AboutYou, { missingAbout, aboutFromProfile, saveAbout } from "./AboutYou";
import { db } from "@/lib/db/dexie";
import { inferSections, isMain } from "@/lib/workout/sections";
import { getPreferences, setPreference } from "@/lib/services/preferencesService";
import { extractJson } from "@/lib/import/extractJson";
import { WORKOUT_TEMPLATE, DIET_TEMPLATE } from "@/lib/import/parseJson";
import { AI_RULES, FENCE, compactJson, copyText } from "./PlanImport";
import Segmented from "./Segmented";
import { FOCUSES } from "@/lib/focuses";
import AiLinks from "./AiLinks";

// A few taps inside FitMate, then ONE prompt; the AI replies with the plan directly, no questions.
// Everything is optional: whatever is left blank, the AI picks a sensible default.
// one = single choice, many = multi choice. `when` shows a question only if it applies.
const QUESTIONS = {
  workout: [
    { id: "level", q: "Your level", type: "one", options: ["Beginner", "Intermediate", "Advanced"], fromProfile: (p) => (p?.experience ? p.experience[0].toUpperCase() + p.experience.slice(1) : null) },
    { id: "chasing", q: "Working towards", hint: "Pick as many as you like.", popular: ["Muscle-up", "Front lever", "Planche", "Handstand", "Human flag", "One-arm pull-up", "Muscle size", "Raw strength"], type: "search", placeholder: "Search skills or type your own", options: ["Muscle-up", "Bar muscle-up", "Ring muscle-up", "Front lever", "Back lever", "Planche", "Full planche", "Straddle planche", "Handstand", "Handstand push-up", "Press to handstand", "Human flag", "One-arm pull-up", "One-arm push-up", "Pistol squat", "Dragon flag", "L-sit", "V-sit", "Manna", "Maltese", "Iron cross", "Weighted pull-ups", "Weighted dips", "Muscle size", "Raw strength", "Endurance", "Fat loss", "Mobility / flexibility"] },
    { id: "bests", q: "Max reps in one set", type: "numbers", options: [], fields: [["pullups", "Pull-ups"], ["dips", "Dips"], ["pushups", "Push-ups"]] },
    { id: "where", q: "Where do you train?", type: "one", options: ["Gym", "Home", "Outdoors"] },
    { id: "equipment", q: "What do you have?", type: "many", options: ["Nothing", "Pull-up bar", "Dip bars / parallettes", "Rings", "Dumbbells", "Resistance bands", "Kettlebell", "Barbell", "Bench"], other: "Something else? e.g. weight vest, cable machine", when: (a) => a.where && a.where[0] !== "Gym" },
    { id: "days", q: "Days per week", type: "one", options: ["3", "4", "5", "6"], fromProfile: (p) => (p?.training_days_per_week ? String(p.training_days_per_week) : null) },
    { id: "time", q: "Time per workout", type: "one", options: ["30 min", "45 min", "60 min", "90 min"] },
    { id: "pain", q: "Any pain to work around?", type: "many", options: ["None", "Shoulder", "Wrist", "Elbow", "Back", "Knee"], other: "Other, e.g. ankle, old injury" },
  ],
  diet: [
    { id: "type", q: "You eat", type: "one", options: ["Veg", "Egg + veg", "Non-veg", "Vegan"] },
    { id: "trainTime", q: "When do you train?", type: "one", options: ["Morning", "Afternoon", "Evening"] },
    { id: "cuisine", q: "Food style", type: "one", options: ["Indian", "Continental", "Mixed"] },
    { id: "meals", q: "Meals a day", type: "one", options: ["3", "4", "5"] },
    { id: "cooking", q: "Cooking time per meal", type: "one", options: ["Under 15 min", "15–30 min", "Don't mind"] },
    { id: "variety", q: "Meals across the week", type: "one", options: ["Different every day", "Rotate 2–3 menus", "Same every day"] },
    { id: "skip", q: "Avoid", type: "many", options: ["Nothing", "Dairy", "Gluten", "Nuts", "Eggs"] },
    { id: "whey", q: "Protein powder (whey)", type: "one", options: ["I have it", "Don't use"], defaultValue: "Don't use" },
  ],
};

const PATTERN = {
  "Muscle-up": "Pull", "Bar muscle-up": "Pull", "Ring muscle-up": "Pull", "Front lever": "Pull", "Back lever": "Pull", "One-arm pull-up": "Pull", "Weighted pull-ups": "Pull", "Iron cross": "Pull",
  Planche: "Push", "Full planche": "Push", "Straddle planche": "Push", "Handstand push-up": "Push", "One-arm push-up": "Push", "Weighted dips": "Push", Maltese: "Push",
  Handstand: "Balance", "Press to handstand": "Balance",
  "Human flag": "Core", "Dragon flag": "Core", "L-sit": "Core", "V-sit": "Core", Manna: "Core",
  "Pistol squat": "Legs",
  "Muscle size": "Goal", "Raw strength": "Goal", Endurance: "Goal", "Fat loss": "Goal", "Mobility / flexibility": "Goal",
};
const patternOf = (skill) => PATTERN[skill] ?? PATTERN[Object.keys(PATTERN).find((k) => k.toLowerCase() === skill.toLowerCase())] ?? "Skill";
// "  one ARM   handstand " -> "One arm handstand"; matches an existing option regardless of case.
export function tidySkill(text, known = []) {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const same = known.find((k) => k.toLowerCase() === clean.toLowerCase());
  if (same) return same;
  const lower = clean.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const PATTERN_ORDER = ["Pull", "Push", "Balance", "Core", "Legs", "Skill", "Goal"];

const EXTRA = { workout: "Anything else? e.g. want a muscle-up, no running", diet: "Anything else? e.g. no mushrooms, cheap meals, whey ok" };

const GOALS = { lose_fat: "lose fat", recomposition: "lose fat and build muscle at the same time (recomposition)", build_muscle: "build muscle", gain_strength: "get stronger", calisthenics_skills: "learn calisthenics skills", maintain: "maintain my current shape", general_fitness: "general fitness" };

function aboutMe(p) {
  if (!p) return [];
  const age = p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth)) / 31_557_600_000) : null;
  return [
    p.gender && `Gender: ${p.gender}`,
    age && `Age: ${age}`,
    p.height_cm && `Height: ${p.height_cm} cm`,
    p.weight_kg && `Weight: ${p.weight_kg} kg`,
    p.target_weight_kg && `Target weight: ${p.target_weight_kg} kg`,
    p.goal && `Goal: ${GOALS[p.goal] ?? p.goal}`,
    p.goal_note && `My goal in my own words: ${p.goal_note}`,
    p.focuses?.length && `I also want to: ${p.focuses.map((id) => FOCUSES.find((x) => x.id === id)?.ai ?? id).join("; ")}. Build these into the training plan without changing my calorie target`,
    p.experience && `Experience: ${p.experience}`,
    p.calories_target && `Daily calories target: ${p.calories_target} kcal`,
    p.protein_target_g && `Daily protein target: ${p.protein_target_g} g`,
  ].filter(Boolean);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
async function loadTraining() {
  const prefs = await getPreferences();
  if (!prefs.activeWorkoutPlanId) return null;
  const plan = await db.workoutPlans.get(prefs.activeWorkoutPlanId);
  if (!plan) return null;
  const days = await db.trainingDays.where("planId").equals(plan.id).toArray();
  const out = [];
  for (const d of days) {
    const ex = inferSections(await db.exercises.where("dayId").equals(d.id).toArray()).filter(isMain);
    const sets = ex.reduce((n, e) => n + (Number(e.sets) || 0), 0);
    for (const w of d.weekdays ?? []) out.push({ w, line: `${DAY_NAMES[w]}: ${d.name} (${ex.length} exercises, ${sets} working sets)` });
  }
  out.sort((a, b) => ((a.w + 6) % 7) - ((b.w + 6) % 7));
  const trainDays = new Set(out.map((o) => o.w));
  const rest = [1, 2, 3, 4, 5, 6, 0].filter((w) => !trainDays.has(w)).map((w) => DAY_NAMES[w]);
  return { name: plan.name, lines: out.map((o) => o.line), rest };
}

// Protein each main meal should carry: daily target / meals per day (rounded).
function proteinPerMeal(profile, answers) {
  const target = Number(profile?.protein_target_g) || 0;
  const meals = Number(answers.meals?.[0]) || 3;
  return target ? Math.round(target / meals) : "an equal share of my daily protein";
}

export function buildPrompt(kind, profile, answers, extra, others = {}, training = null) {
  const variety = answers.variety?.[0] ?? "Different every day";
  const me = aboutMe(profile);
  const picked = QUESTIONS[kind]
    .filter((q) => !q.when || q.when(answers))
    .map((q) => {
      if (q.type === "numbers") {
        const nums = q.fields.map(([k, label]) => (others[q.id]?.[k] ? `${label} ${others[q.id][k]}` : null)).filter(Boolean);
        return nums.length ? `${q.q}: ${nums.join(", ")}` : null;
      }
      if (q.type === "search" && answers[q.id]?.length) {
        const groups = {};
        for (const sk of answers[q.id]) (groups[patternOf(sk)] ??= []).push(sk);
        const lines = PATTERN_ORDER.filter((p) => groups[p]).map((p) => {
          return p === "Goal" ? `  - Overall goals: ${groups[p].join(", ")}` : `  - ${p}: ${groups[p].join(", ")}`;
        });
        return `Skills I am working towards, by movement pattern:\n${lines.join("\n")}`;
      }
      const parts = [...(answers[q.id] ?? []), others[q.id]?.trim()].filter(Boolean);
      return parts.length ? `${q.q.replace(/\?$/, "")}: ${parts.join(", ")}` : null;
    })
    .filter(Boolean);
  if (extra.trim()) picked.push(`Also: ${extra.trim()}`);
  const fit =
    kind === "workout"
      ? [
          "- Match MY level. Start every skill at the progression I can do now (from my current bests) and set reps/holds just above my bests. Never fill the plan with beginner moves (basic push-ups, bodyweight squats, wall sits) for an intermediate or advanced athlete.",
          "- Skills: don't train every skill hard at once. For each movement pattern pick ONE priority skill (the best fit for my current bests) and give it heavy, fresh work 2-3x per week at the start of sessions, with specific progressions (e.g. advanced tuck -> one-leg front lever). Push and pull priorities can share a session. Other skills get lower-volume maintenance work. Mark priority skills with 'Priority' at the start of their notes. Then strength work, then accessories.",
          "- Start every session with 2-3 short warm-up items marked \"section\": \"warmup\" and end with 1-2 cool-down stretches marked \"section\": \"cooldown\". Main work has no section field.",
          "- Order the main work from hardest to easiest, by how much fresh nervous system it needs: 1) (after the warm-up) 2) hardest skill work (static holds and skill reps, e.g. planche, front lever, handstand), 3) heavy strength (weighted or hardest bodyweight compounds), 4) moderate strength/hypertrophy, 5) accessories and isolation, 6) core, 7) conditioning or mobility last. Within each group, put the most demanding exercise first.",
          "- Use my days per week (leave rest days out), fit each session into my time, use only my equipment, and work around any pain. Progression cues in notes.",
        ].join("\n")
      : [
          `- Daily protein must hit my target every day; calories within 5% of my target${profile?.calories_target ? "" : " (work both out from my details and goal)"}.`,
          variety === "Same every day"
            ? training
              ? "- Two day types: one training-day menu (weekdays = my training days) and one rest-day menu (weekdays = my rest days)."
              : "- One menu for every day of the week (all seven weekdays)."
            : variety === "Rotate 2–3 menus"
              ? "- Create 2-3 different menus and spread them across the week so no menu repeats on consecutive days; every weekday must be covered exactly once across the days."
              : "- Create SEVEN separate days, one per weekday (each with exactly one weekday), and give every day DIFFERENT meals. A meal may repeat at most twice in the week.",
          training ? "- Training days (see my workout plan) get more carbs around the workout; rest days get fewer carbs; protein stays the same every day. Average calories across the week must hit my target." : "",
          "- Time meals around my training time: a carb + protein meal 1.5-3 h before training and a protein-rich meal within 2 h after. Mark those meals with \"timing\": \"pre-workout\" or \"post-workout\" (leave it out on other meals).",
          "- \"name\" is ONLY the dish name (e.g. \"Paneer Dal Curry\"). NEVER put Pre-workout, Post-workout, Rest day, Training day or meal labels in any name, for meals or alternatives.",
          "- Everyday foods I can actually buy and cook, quantities in grams or household measures, realistic portions. Respect my diet type and foods to avoid.",
          "- MOST IMPORTANT: food must be easy to make, or I won't follow it. Prefer simple home staples I already know over fancy recipes.",
          answers.whey?.[0] === "I have it"
            ? "- Protein powder: I have whey. Use it in at most ONE dish per day; every other dish (and every alternative) gets its protein from food."
            : "- NO protein powder: do NOT use whey, protein powder or any supplement in ANY meal or alternative. If a dish needs it to reach its protein, change the dish.",
          `- PROTEIN FROM FOOD: each main meal should carry about ${proteinPerMeal(profile, answers)} g protein so the day adds up. Reach it with real food the diet allows, combining 2 sources per dish: soya chunks/granules (50 g dry ≈ 26 g), paneer (100 g ≈ 18 g), tofu (100 g ≈ 10 g), hung curd / Greek yogurt (200 g ≈ 20 g), curd (200 g ≈ 7 g), milk (300 ml ≈ 10 g), besan (60 g ≈ 13 g), sattu (50 g ≈ 10 g), cooked dal/chana/rajma (1 cup ≈ 15 g), peanuts or peanut butter (30 g ≈ 8 g), seeds (20 g ≈ 4 g), plus eggs, chicken or fish if my diet allows.`,
          "- Every category keeps its own whey-free versions. Example high-protein OATS without powder: oats cooked in milk + hung curd + peanut butter + chia; savoury masala oats with soya granules; oats chilla with paneer. Do the same for poha (with soya/peanuts + curd), sandwiches (paneer/soya/hung-curd filling), chilla (besan/moong + paneer/tofu).",
          "- Alternatives and variety matter most after easy food: follow the ALTERNATIVES, VARIETY and CHECK rules below exactly. Alternatives follow my diet type, foods to avoid and cooking time too.",
          "- Keep every meal EASY: at most 6 common ingredients, no special equipment, within my cooking time. Reuse ingredients across the week so the shopping list stays short, and batch-cook where it helps (e.g. dal or rice for 2 days).",
          "- Make it easy to understand: plain meal names (local name in brackets if useful). In \"recipe\" write exactly this layout: \"Prep: X min\" on the first line, then \"Ingredients: item qty, item qty\", then numbered steps \"1. ... 2. ...\" with at most 4 short steps in simple words.",
        ]
          .filter(Boolean)
          .join("\n");
  const trainingBlock =
    kind === "diet" && training
      ? `\nMy current workout plan (${training.name}):\n${training.lines.map((l) => `- ${l}`).join("\n")}\n- Rest days: ${training.rest.join(", ") || "none"}\n`
      : "";
  return `Create a personalised ${kind} plan for me for the FitMate app.

About me:
${me.length ? me.map((x) => `- ${x}`).join("\n") : "- Adult, general fitness"}
${trainingBlock}
My choices:
${picked.length ? picked.map((x) => `- ${x}`).join("\n") : "- None, use sensible defaults"}

Do NOT ask me any questions. Anything not given: choose sensible defaults.
Reply format: start IMMEDIATELY with one short line (e.g. "Building your plan now…"), then exactly ONE ${FENCE}json code block with the whole plan, then nothing else. Do not think or plan out loud before the code block; write it straight away.
${fit}
- Keep it compact: one ${kind === "workout" ? "exercise" : "meal"} object per line, exactly like this example:
${FENCE}json
${compactJson(kind === "workout" ? WORKOUT_TEMPLATE : DIET_TEMPLATE)}
${FENCE}

Rules:
${AI_RULES[kind].map((r) => `- ${r}`).join("\n")}
`;
}

// Compact pill used for every choice: auto width, wraps naturally, clear selected state.
const chip = (on) =>
  `inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors active:scale-95 ${
    on
      ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:border-amber-400 dark:bg-amber-400/10 dark:text-amber-200"
      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-transparent dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
  }`;

const storeKey = (kind) => `aiAnswers_${kind}`;

export default function AiCreate({ kinds, onImport, onBack }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() => (user ? cachedProfile(user.id) : null));
  const needsAbout = missingAbout(profile).length > 0;
  const [about, setAbout] = useState(() => aboutFromProfile(user ? cachedProfile(user.id) : null, { draft: true }));
  const [aboutError, setAboutError] = useState("");

  // Save missing basics to the profile (targets worked out from them) before building the prompt.
  async function ensureProfile() {
    if (!needsAbout) return profile;
    const r = await saveAbout({ userId: user.id, name: profile?.full_name || displayName(user), about });
    if (r.error) {
      setAboutError(r.error);
      return null;
    }
    setAboutError("");
    setProfile(r.profile);
    return r.profile;
  }

  async function copyPrompt() {
    const p = await ensureProfile();
    if (!p && needsAbout) return false;
    return copyText(buildPrompt(kind, p ?? profile, answers, extra, others, training));
  }
  const [kind, setKind] = useState(kinds[0]);
  const [answers, setAnswers] = useState({});
  const [extra, setExtra] = useState("");
  const [others, setOthers] = useState({});
  const [customSkills, setCustomSkills] = useState([]);
  const [training, setTraining] = useState(null);
  useEffect(() => {
    loadTraining().then(setTraining).catch(() => setTraining(null));
  }, []);
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  // Last answers are a synced preference; the profile fills what it can.
  useEffect(() => {
    let cancelled = false;
    getPreferences().then((prefs) => {
      if (!cancelled) setCustomSkills(Array.isArray(prefs.customSkills) ? prefs.customSkills : []);
      if (cancelled) return;
      const saved = {};
      const raw = prefs[storeKey(kind)] ?? {};
      // Keep only answers that are still valid options (older versions stored a different shape).
      for (const q of QUESTIONS[kind]) {
        const v = raw?.[q.id];
        const list = Array.isArray(v) ? v : Array.isArray(v?.picked) ? v.picked : [];
        const valid = q.type === "search" ? list.filter((x) => typeof x === "string" && x.trim()) : list.filter((x) => q.options.includes(x));
        if (valid.length) saved[q.id] = valid;
      }
      for (const q of QUESTIONS[kind]) {
        const v = q.fromProfile?.(profile) ?? q.defaultValue;
        if (v && !saved[q.id]?.length) saved[q.id] = [v];
      }
      setAnswers(saved);
    });
    setExtra("");
    setCopied(false);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  function setList(q, next) {
    const out = { ...answers, [q.id]: next };
    setAnswers(out);
    setCopied(false);
    setPreference(storeKey(kind), out);
  }

  function toggle(q, option) {
    const cur = answers[q.id] ?? [];
    const none = q.options[0] === "None" || q.options[0] === "Nothing" ? q.options[0] : null;
    let next;
    if (q.type === "one") next = cur[0] === option ? [] : [option];
    else if (option === none) next = cur.includes(none) ? [] : [none];
    else next = cur.includes(option) ? cur.filter((x) => x !== option) : [...cur.filter((x) => x !== none), option];
    const out = { ...answers, [q.id]: next };
    setAnswers(out);
    setCopied(false);
    setPreference(storeKey(kind), out);
  }

  function submit() {
    setError("");
    try {
      onImport(extractJson(reply));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="-ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {kinds.length > 1 && <Segmented options={[["workout", "Workout"], ["diet", "Diet"]]} value={kind} onChange={setKind} />}
      </div>

      {needsAbout && (
        <div className="mb-5">
          <AboutYou value={about} onChange={setAbout} error={aboutError} />
        </div>
      )}
      <StepTitle n={1} text="Tap what fits you" sub="All optional. Skip any and the AI decides." />
      <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
        {QUESTIONS[kind]
          .filter((q) => !q.when || q.when(answers))
          .map((q) => (
            <div key={q.id} className="animate-fade-up py-3.5 first:pt-0">
              <div className="mb-2.5">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{q.q}</p>
                {q.hint && <p className="text-xs text-neutral-500">{q.hint}</p>}
              </div>
              {q.type === "numbers" && (
                <div className="grid grid-cols-3 gap-2">
                  {q.fields.map(([k, label]) => (
                    <label key={k} className="block">
                      <span className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        value={others[q.id]?.[k] ?? ""}
                        onChange={(e) => {
                          setOthers((o) => ({ ...o, [q.id]: { ...o[q.id], [k]: e.target.value } }));
                          setCopied(false);
                        }}
                        className="h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-center text-base font-semibold tabular-nums outline-none focus:border-amber-500 dark:border-neutral-700"
                      />
                    </label>
                  ))}
                </div>
              )}
              {q.type === "search" && <SearchPicks
                  options={[...q.options, ...customSkills.filter((c) => !q.options.some((o) => o.toLowerCase() === c.toLowerCase()))]}
                  popular={q.popular}
                  value={answers[q.id] ?? []}
                  placeholder={q.placeholder}
                  onChange={(next) => setList(q, next)}
                  onCreate={(skill) => {
                    if (q.options.includes(skill) || customSkills.some((c) => c.toLowerCase() === skill.toLowerCase())) return;
                    const next = [...customSkills, skill];
                    setCustomSkills(next);
                    setPreference("customSkills", next);
                  }}
                />}
              {q.type === "one" && (
                <div role="radiogroup" aria-label={q.q} className="flex flex-wrap gap-2">
                  {q.options.map((o) => {
                    const on = answers[q.id]?.includes(o);
                    return (
                      <button key={o} type="button" role="radio" aria-checked={on} onClick={() => toggle(q, o)} className={chip(on)}>
                        {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        {o}
                      </button>
                    );
                  })}
                </div>
              )}
              {q.type === "many" && <div className="flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const on = answers[q.id]?.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(q, o)}
                      className={chip(on)}
                    >
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      {o}
                    </button>
                  );
                })}
              </div>}
              {q.other && (
                <input
                  value={others[q.id] ?? ""}
                  onChange={(e) => {
                    setOthers((o) => ({ ...o, [q.id]: e.target.value }));
                    setCopied(false);
                  }}
                  placeholder={q.other}
                  className={`${q.type === "text" ? "" : "mt-2 "}h-10 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-sm outline-none focus:border-amber-500 dark:border-neutral-700`}
                />
              )}
            </div>
          ))}
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-neutral-800 dark:text-neutral-100">Anything else? <span className="font-normal text-neutral-500">(optional)</span></span>
          <input
            value={extra}
            onChange={(e) => {
              setExtra(e.target.value);
              setCopied(false);
            }}
            placeholder={EXTRA[kind].replace(/^Anything else\? /, "")}
            className="h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 text-sm outline-none focus:border-amber-500 dark:border-neutral-700"
          />
        </label>
      </div>

      <div className="mt-6">
        <StepTitle n={2} text="Copy and send to ChatGPT, Claude or Gemini" sub="It replies with your plan straight away." />
        <button
          type="button"
          onClick={async () => setCopied(await copyPrompt())}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${copied ? "bg-emerald-600" : "bg-amber-600 active:bg-amber-700"}`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Prompt copied" : "Copy prompt"}
        </button>
        {needsAbout ? (
          <p className="mt-2 text-xs text-neutral-500">Fill in <b>About you</b> above, then copy the prompt.</p>
        ) : (
          <AiLinks prompt={buildPrompt(kind, profile, answers, extra, others, training)} onCopied={() => setCopied(true)} />
        )}
      </div>

      <div className="mt-6">
        <StepTitle n={3} text="Paste its reply here" />
        <textarea
          value={reply}
          onChange={(e) => {
            setReply(e.target.value);
            setError("");
          }}
          rows={4}
          placeholder="Tap Copy on its code block, then paste…"
          className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 font-mono text-xs outline-none focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-950"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        <button type="button" disabled={!reply.trim()} onClick={submit} className="mt-2 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900">
          Import plan
        </button>
      </div>
    </div>
  );
}

function StepTitle({ n, text, sub }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-[11px] font-semibold text-white">{n}</span>
      <span>
        <span className="block text-sm font-semibold">{text}</span>
        {sub && <span className="block text-xs text-neutral-500">{sub}</span>}
      </span>
    </div>
  );
}

// Skills picker: chosen skills sit inside the box as pills; suggestions sit right
// below as one-tap chips (popular ones before typing, matches while typing, plus "Add" for anything new).
// Inline instead of a dropdown, so the phone keyboard never hides it.
function SearchPicks({ options, popular = [], value, onChange, placeholder, onCreate }) {
  const [text, setText] = useState("");
  const input = useRef(null);
  const q = text.trim().toLowerCase();
  const has = (v) => value.some((x) => x.toLowerCase() === v.toLowerCase());
  const pool = q ? options.filter((o) => o.toLowerCase().includes(q)) : popular;
  const suggestions = pool.filter((o) => !has(o)).slice(0, q ? 6 : 8);
  const exact = options.find((o) => o.toLowerCase() === q);
  const canAddTyped = q && !exact && !has(text.trim());

  function add(item) {
    const v = tidySkill(item, options);
    if (v && !options.includes(v)) onCreate?.(v);
    if (!v || has(v)) return;
    onChange([...value, v]);
    setText("");
  }

  return (
    <div className="min-w-0">
      <div
        onClick={(e) => e.target === e.currentTarget && input.current?.focus()}
        className="flex min-h-11 cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-neutral-300 p-1.5 focus-within:border-amber-500 dark:border-neutral-700"
      >
        {value.map((v) => (
          <span key={v} className="animate-pop flex items-center gap-1 rounded-full bg-amber-500/15 py-1 pr-1 pl-3 text-sm font-medium text-amber-700 [animation-duration:200ms] dark:text-amber-300">
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x !== v));
              }}
              aria-label={`Remove ${v}`}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-amber-500/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {(
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(exact ?? (suggestions[0] && q ? suggestions[0] : text));
              } else if (e.key === "Backspace" && !text && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            placeholder={value.length ? "Add another…" : placeholder}
            className="h-9 min-w-32 flex-1 bg-transparent px-2 text-sm outline-none"
          />
        )}
      </div>

      {(suggestions.length > 0 || canAddTyped) && (
        <div className="-mr-5 mt-2 flex gap-1.5 overflow-x-auto pr-8 pb-1 [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none]">
          {canAddTyped && (
            <button type="button" onClick={() => add(text)} className="flex shrink-0 items-center gap-1 rounded-full bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white active:scale-95">
              <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Add &ldquo;{tidySkill(text, options)}&rdquo;
            </button>
          )}
          {suggestions.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => add(o)}
              className="flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-3 py-1.5 text-sm whitespace-nowrap text-neutral-700 hover:bg-amber-500/15 hover:text-amber-700 active:scale-95 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <Plus className="h-3.5 w-3.5" /> {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
