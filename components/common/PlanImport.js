"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Upload, PencilLine, ChevronRight, ChevronLeft, Copy, Check, WandSparkles, FileText } from "lucide-react";
import AiCreate from "./AiCreate";
import AiLinks from "./AiLinks";
import { DISH_CATEGORIES } from "@/lib/diet/categories";
import { extractPdfLines } from "@/lib/import/pdfText";
import { detectKind } from "@/lib/import/parsePlan";
import { parsePlanJson, WORKOUT_TEMPLATE, DIET_TEMPLATE } from "@/lib/import/parseJson";
import { importData } from "@/lib/services/backupService";
import { saveDraft } from "@/lib/import/draft";
import { extractJson } from "@/lib/import/extractJson";
import Segmented from "./Segmented";
import { useScrollTopOn } from "@/lib/useScrollTop";
import AiWaitHint from "./AiWaitHint";
import { useConfirm } from "./ConfirmDialog";

const KINDS = [
  ["auto", "Detect"],
  ["workout", "Workout"],
  ["diet", "Diet"],
];

export const FIELD_GUIDE = {
  workout: {
    required: ["Day name or weekday (e.g. Monday, Push Day)", "Exercise name", "Sets", "Reps, or hold time in seconds"],
    optional: ["Rest time (e.g. rest 90s or 2 min)", "Weight in kg", "Notes in (brackets)"],
    example: "Monday – Push Day\nTuck Planche Push-up 3 x 6 rest 2 min\nPlanche Lean 4 x 20s\nDips 3 x 8 @ 10 kg",
  },
  diet: {
    required: ["Meal slot (Breakfast, Lunch, Snack, Dinner)", "Food or meal name", "Protein (g)", "Calories (kcal)"],
    optional: ["Quantity (e.g. 150 g, 2 roti)", "Carbs and fat (g)", "Day or weekday if it changes by day"],
    example: "Breakfast\n- Oats 50 g with milk (P: 15g, C: 45g, F: 8g, 320 kcal)\nLunch: Chicken breast 150 g, 250 kcal, 46 g protein",
  },
};

// PDF or JSON -> parsed plan -> builder for review (nothing saved until the user saves there).
// `kind` fixes the plan type; `returnTo` is where the builder goes after saving.
export default function PlanImport({ kind: fixedKind, returnTo, manualHref, showGuide = true, onRestored }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [kind, setKind] = useState(fixedKind ?? "auto");

  // Opened from a plan section (?kind=workout|diet) or Home (?start=create|have).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const start = q.get("start");
    if (start === "create") setMode("create");
    if (start === "have") setMode("ai");
    if (fixedKind) return;
    const k = q.get("kind");
    if (k === "workout" || k === "diet") setKind(k);
  }, [fixedKind]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  function openBuilder(type, draft) {
    saveDraft(type, draft);
    const path = type === "workout" ? "/plans/workout/new" : "/plans/diet/new";
    router.push(returnTo ? `${path}?return=${encodeURIComponent(returnTo)}` : path);
  }

  // A plan pasted from an AI chat (already parsed JSON).
  function importPasted(data, sourceName) {
    const parsed = parsePlanJson(data);
    if (parsed.kind === "backup") throw new Error("That is a FitMate backup file. Upload it in step 1 instead.");
    openBuilder(parsed.kind, { name: parsed.name || sourceName || `My ${parsed.kind} plan`, source: "your AI chat", days: parsed.days, groceries: parsed.groceries });
  }

  // A file already in FitMate's format (or a backup): no AI needed.
  async function importDirect(parsed, data, name, fileName) {
    if (parsed.kind === "backup") {
      if (!(await confirm({ title: "Restore this backup?", message: "It replaces all plans and history on this device with the ones in the file.", confirmLabel: "Restore", tone: "warn" }))) return;
      await importData(parsed.backup);
      onRestored?.();
      return;
    }
    openBuilder(parsed.kind, { name: parsed.name || name, source: fileName, days: parsed.days, groceries: parsed.groceries });
  }

  const [mode, setMode] = useState(null);
  useScrollTopOn(mode);
  const [pickManual, setPickManual] = useState(false);

  const kindsList = fixedKind ? [fixedKind] : kind === "diet" ? ["diet", "workout"] : ["workout", "diet"];
  if (mode === "create") return <AiCreate kinds={kindsList} onImport={importPasted} onBack={() => setMode(null)} />;
  if (mode) return <AiConvert kinds={kindsList} onImport={importPasted} onDirect={importDirect} onBack={() => setMode(null)} />;

  return (
    <div className="space-y-2">
      <OptionRow Icon={WandSparkles} title="Make me a plan" sub="No plan yet? Answer a few taps, AI builds it." tone="amber" onClick={() => setMode("create")} />
      <OptionRow Icon={Sparkles} title="I have a plan" sub="Upload your coach's PDF or file. AI puts it in FitMate's format." tone="violet" onClick={() => setMode("ai")} />
      {manualHref || kind !== "auto" ? (
        <Link href={manualHref ?? `/plans/${kind}/new`} className="block">
          <OptionRow as="div" Icon={PencilLine} title="Type it in" sub="Add days and exercises yourself" tone="neutral" />
        </Link>
      ) : (
        <>
          <OptionRow Icon={PencilLine} title="Type it in" sub="Add days and exercises yourself" tone="neutral" onClick={() => setPickManual((v) => !v)} />
          {pickManual && (
            <div className="animate-fade-up grid grid-cols-2 gap-2">
              <Link href="/plans/workout/new" className="rounded-xl border border-neutral-200 py-3 text-center text-sm font-semibold hover:border-emerald-500 dark:border-neutral-800">
                Workout plan
              </Link>
              <Link href="/plans/diet/new" className="rounded-xl border border-neutral-200 py-3 text-center text-sm font-semibold hover:border-emerald-500 dark:border-neutral-800">
                Diet plan
              </Link>
            </div>
          )}
        </>
      )}
      {status && <p className={`px-1 pt-1 text-sm ${status.error ? "text-red-600" : "text-emerald-600"}`}>{status.text}</p>}
    </div>
  );
}

const TONES = {
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
};

function OptionRow({ as: Tag = "button", Icon, title, sub, tone, onClick, highlight }) {
  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
        highlight ? "border-emerald-500 bg-emerald-500/5" : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/50"
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-neutral-500">{sub}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
    </Tag>
  );
}


export const AI_RULES = {
  workout: [
    'One entry in "days" per training day. "weekdays" uses Mon, Tue, Wed, Thu, Fri, Sat, Sun.',
    'Use "reps" for repetitions, or "holdSec" (seconds) for timed holds like planks or planche. Never both.',
    '"restSec" is rest between sets in seconds (2 min = 120). "weightKg" only if extra weight is used.',
    'If a range is given (e.g. 8–12), use the lower number and write the range in "notes". Put "each side" and form cues in "notes".',
    '"section": "warmup" for warm-up/prep items (mobility, activation, light sets), "cooldown" for stretches at the end. Leave "section" out for main work. Keep warm-up items first and cool-down items last.',
    'ALTERNATIVES: every main exercise (not warm-up or cool-down) has "alternatives": exactly 2 swaps that train the same muscles at a similar effort, each {"name","sets","reps" or "holdSec","notes"}. First = an easier or more common progression, second = one needing different or no equipment. Say which in "notes" ("Easier", "No rings"). Keep all exercises from my plan; alternatives are extra.',
  ],
  diet: [
    'DAYS: one entry in "days" per day of the plan, with its "weekdays". If every day is the same, use one day with all seven weekdays.',
    'SLOTS: "slot" is exactly one of Breakfast, Lunch, Snack, Dinner.',
    'NUMBERS: "calories" (kcal), "proteinG", "carbsG", "fatG" (grams) are plain numbers on every meal and every alternative. Estimate from ingredients if needed.',
    'RECIPE: "recipe" = "Prep: X min" on line 1, then "Ingredients: item amount, item amount", then at most 4 numbered short steps.',
    'AMOUNTS: write each ingredient the way people cook, with grams in brackets: oils/ghee/butter in tsp or tbsp ("oil 1 tsp (5 g)"), vegetables and fruits by count ("onion 1 medium (100 g)", "tomato ½ medium (50 g)"), flour as rotis ("atta 2 rotis (60 g)"), curd/milk in cups or ml ("curd ½ cup (120 g)"), eggs by count, paneer/tofu/meat in grams. Amounts must be realistic to cook the dish (at least 1 tsp oil for anything fried, sautéed or tempered) and still add up to the macros.',
    'GROCERIES: add a top-level "groceries" list = everything to buy for ONE week of this plan (all days, main meals; spices and staples too), in shop-friendly sizes rounded up to how it is sold ("Paneer (low-fat)": "1 kg", "Milk": "2 L", "Eggs": "1 dozen", "Onions": "1 kg", "Coriander": "1 bunch"). Each item {"item","amount","group"} with "group" exactly one of Vegetables, Fruits, Dairy & eggs, Protein, Pulses, Grains & flour, Nuts & seeds, Oils & spices, Other.',
    `CATEGORY (required on every meal AND every alternative): exactly one of ${DISH_CATEGORIES.join(", ")}. Decide by the main dish: "Besan chilla with curd" = Chilla & dosa, "Soya pulao" = Rice, "Sattu shake with toast" = Shake & smoothie.`,
    'DIET (required on every meal AND every alternative): "veg", "egg", "nonveg" or "vegan" = what that dish contains.',
    'ALTERNATIVES: every meal has EXACTLY 3 "alternatives". Each alternative is a DIFFERENT category from the main meal AND from the other two alternatives (main = Chilla & dosa -> alternatives e.g. Oats, Poha & upma, Sandwich & toast). Protein and calories within 10% of the main meal. Each alternative has the same fields as a meal: "name","category","diet","serving","calories","proteinG","carbsG","fatG","recipe" — but keep each alternative "recipe" to ONE short line (e.g. "Prep: 10 min. Cook besan batter with paneer filling.").',
    'VARIETY (per slot, meals + alternatives across the week): use at least 4 different categories, no category for more than 40% of that slot, and never the same main dish more than twice a week.',
    'VIDEO SEARCH (required on every meal AND every alternative): "videoSearch" = 2-5 words naming the MAIN dish to cook, the way people search YouTube for its recipe (e.g. "dal paneer tadka", "soya poha", "besan paneer chilla", "masala oats"). Leave out sides (roti, rice, curd, salad) and words like post-workout or high protein.',
    'VIDEO: never add "videoUrl" (FitMate finds the video from "videoSearch"). Do not search the web for anything.',
    'BEFORE YOU FINISH (silently, don\'t write it): every meal has 3 alternatives in 3 other categories; every dish has "category", "diet" and "videoSearch"; nothing uses foods I avoid; each day hits my protein target. Your reply is still just the one line + the code block.',
  ],
};

// Compact example: one item per line, so the AI mirrors it and the reply stays short.
export function compactJson(plan) {
  const itemsKey = plan.type === "workout" ? "exercises" : "meals";
  const days = plan.days.map((d) => {
    const items = d[itemsKey].map((it) => `      ${JSON.stringify(it)}`).join(",\n");
    return `    {"name": ${JSON.stringify(d.name)}, "weekdays": ${JSON.stringify(d.weekdays)}, "${itemsKey}": [\n${items}\n    ]}`;
  });
  return `{"type": "${plan.type}", "name": ${JSON.stringify(plan.name)}, "days": [\n${days.join(",\n")}\n]}`;
}

export const FENCE = "```";

const aiPrompt = (kind) =>
  `Convert my ${kind} plan into JSON for the FitMate app.

How to reply:
- Reply format: start IMMEDIATELY with exactly this line: "⏳ Converting your plan. This takes about 1–3 minutes, keep this chat open. It's working.", then exactly ONE ${FENCE}json code block with the whole plan, then nothing else. Do not think or plan out loud before the code block, and do not search the web; write it straight away from what you know.
- Keep it compact: put each ${kind === "workout" ? "exercise" : "meal"} object on a single line, exactly like the example.

Example of the exact structure:
${FENCE}json
${compactJson(kind === "workout" ? WORKOUT_TEMPLATE : DIET_TEMPLATE)}
${FENCE}

Rules:
${AI_RULES[kind].map((r) => `- ${r}`).join("\n")}

Here is my plan (text or attached file):
`;

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs HTTPS; fall back to a hidden textarea (works on plain http too).
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

// "I have a plan": upload it (PDF, JSON, text) -> we build a prompt that includes the plan and
// FitMate's format -> any AI converts it -> paste the reply back -> review before saving.
// Files already in FitMate's format skip the AI entirely.

async function readSource(file) {
  const base = file.name.replace(/\.(pdf|json|txt|md|csv)$/i, "").replace(/[_-]+/g, " ").trim();
  if (/\.json$/i.test(file.name) || file.type === "application/json") {
    const raw = await file.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { name: base, file: file.name, text: raw, note: "JSON file" };
    }
    // Already FitMate's format (or a backup): no AI needed.
    try {
      const parsed = parsePlanJson(data);
      return { name: base, file: file.name, direct: parsed, data };
    } catch {
      return { name: base, file: file.name, text: JSON.stringify(data, null, 1), note: "JSON file" };
    }
  }
  if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
    const lines = await extractPdfLines(file);
    if (!lines.length) return { name: base, file: file.name, text: "", scanned: true, note: "Scanned PDF" };
    return { name: base, file: file.name, text: lines.join("\n"), note: "PDF", kind: detectKind(lines) };
  }
  if (/\.(txt|md|csv)$/i.test(file.name) || file.type.startsWith("text/")) {
    const text = await file.text();
    return { name: base, file: file.name, text, note: "Text file", kind: detectKind(text.split("\n")) };
  }
  throw new Error("Please choose a PDF, JSON or text file.");
}

function planPrompt(kind, source) {
  const head = aiPrompt(kind).replace(/Here is my plan \(text or attached file\):\n$/, "");
  if (source.scanned) return `${head}My plan is in the file I've attached (a scanned PDF). Read it carefully and convert all of it.`;
  // The whole plan, never shortened: accuracy matters more than prompt length.
  const text = source.text;
  return `${head}Here is my plan, exactly as written in my ${source.note?.toLowerCase() ?? "file"}${source.file ? ` "${source.file}"` : ""}. Convert all of it; don't drop days, sets or meals.\n\n<<<PLAN\n${text.trim()}\nPLAN>>>`;
}

function AiConvert({ kinds, onImport, onBack, onDirect }) {
  const [source, setSource] = useState(null);
  const [kind, setKind] = useState(kinds[0]);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  async function pick(file) {
    if (!file) return;
    setReading(true);
    setReadError("");
    setCopied(false);
    try {
      const s = await readSource(file);
      if (s.direct) {
        if (kinds.length === 1 && s.direct.kind !== "backup" && s.direct.kind !== kinds[0]) throw new Error(`This file is a ${s.direct.kind} plan, not a ${kinds[0]} plan.`);
        return await onDirect(s.direct, s.data, s.name, s.file);
      }
      if (s.kind && kinds.includes(s.kind)) setKind(s.kind);
      setSource(s);
    } catch (e) {
      setReadError(e.message || "Couldn't read this file.");
    } finally {
      setReading(false);
    }
  }
  function useText() {
    const text = pasted.trim();
    if (text.length < 20) return setReadError("Paste the whole plan (days, exercises or meals).");
    const k = detectKind(text.split("\n"));
    if (kinds.includes(k)) setKind(k);
    setSource({ name: "My plan", text, note: "Pasted text" });
    setPasting(false);
    setReadError("");
    setCopied(false);
  }
  function submit() {
    setError("");
    try {
      onImport(extractJson(reply), source?.name);
    } catch (err) {
      setError(err.message);
    }
  }

  const prompt = source ? planPrompt(kind, source) : "";
  const stepDone = [Boolean(source), copied, false];

  return (
    <div className="min-w-0">
      <button type="button" onClick={onBack} className="-ml-2 mb-3 flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
      <h3 className="text-lg font-semibold">Bring in your plan</h3>
      <p className="mt-1 text-sm text-neutral-500">Upload it, let any AI put it in FitMate&apos;s format, then check everything before it&apos;s saved.</p>

      <ol className="mt-5 space-y-3">
        {/* 1. Upload */}
        <StepCard n={1} done={stepDone[0]} title="Upload your plan" active>
          {!source ? (
            <>
              <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 px-4 py-6 text-center transition-colors hover:border-emerald-500 hover:bg-emerald-500/5 dark:border-neutral-700 ${reading ? "pointer-events-none opacity-60" : ""}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">{reading ? "Reading your plan…" : "Choose a PDF, JSON or text file"}</span>
                <span className="text-xs text-neutral-500">From your coach, an app, or any AI chat</span>
                <input type="file" accept="application/pdf,.pdf,application/json,.json,text/plain,.txt,.md,.csv" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {pasting ? (
                <div className="mt-3">
                  <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={5} placeholder="Paste your plan here: days, exercises with sets and reps, or meals…" className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-950" />
                  <button type="button" onClick={useText} className="mt-2 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900">Use this text</button>
                </div>
              ) : (
                <button type="button" onClick={() => setPasting(true)} className="mt-2 w-full text-center text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                  No file? Paste the plan as text
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <FileText className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold break-words">{source.file ?? "Pasted plan"}</span>
                <span className="block text-xs text-neutral-500">
                  {source.scanned ? "Scanned PDF: you'll attach it in the AI chat" : `${source.note} · ${source.text.length.toLocaleString()} characters read`}
                </span>
              </span>
              <button type="button" onClick={() => { setSource(null); setCopied(false); setReply(""); }} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700">
                Change
              </button>
            </div>
          )}
          {source && kinds.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-neutral-500">This is a</span>
              <Segmented options={[["workout", "Workout plan"], ["diet", "Diet plan"]]} value={kind} onChange={(k) => { setKind(k); setCopied(false); }} />
            </div>
          )}
          {readError && <p className="mt-2 text-sm text-red-600">{readError}</p>}
        </StepCard>

        {/* 2. Send to AI */}
        <StepCard n={2} done={stepDone[1]} title="Send it to any AI" active={Boolean(source)}>
          <p className="text-sm text-neutral-500">
            {source?.scanned
              ? "Copy the prompt, open an AI chat, paste it and attach your PDF."
              : "The prompt already includes your plan and FitMate's format. Copy it and paste it into any AI chat."}
          </p>
          <button type="button" onClick={async () => setCopied(await copyText(prompt))} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${copied ? "bg-emerald-600" : "bg-violet-600 active:bg-violet-700"}`}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Prompt copied" : "Copy prompt"}
          </button>
          <AiLinks prompt={prompt} onCopied={() => setCopied(true)} />
          <details className="mt-3 text-xs text-neutral-500">
            <summary className="cursor-pointer">See the prompt</summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-neutral-100 p-3 text-[11px] whitespace-pre-wrap dark:bg-neutral-950">{prompt}</pre>
          </details>
        </StepCard>

        {/* 3. Paste reply */}
        <StepCard n={3} done={false} title="Paste the AI's reply" active={Boolean(source)}>
          <AiWaitHint minutes="1–3" />
          <textarea value={reply} onChange={(e) => { setReply(e.target.value); setError(""); }} rows={4} placeholder="Paste the whole reply here…" className="w-full rounded-xl border border-neutral-300 bg-white p-3 font-mono text-xs outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-950" />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          <button type="button" disabled={!reply.trim()} onClick={submit} className="mt-2 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900">
            Review my plan
          </button>
        </StepCard>
      </ol>
    </div>
  );
}

function StepCard({ n, title, done, active, children }) {
  return (
    <li className={`rounded-2xl border p-4 transition-opacity ${active ? "border-neutral-200 dark:border-neutral-800" : "pointer-events-none border-neutral-200/60 opacity-45 dark:border-neutral-800/60"}`}>
      <p className="mb-3 flex items-center gap-2.5 font-semibold">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-white ${done ? "bg-emerald-600" : "bg-violet-600"}`}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
        {title}
      </p>
      {children}
    </li>
  );
}

function FieldList({ title, items, required }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium text-neutral-500">{title}</p>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${required ? "bg-amber-500" : "bg-neutral-400"}`} />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
