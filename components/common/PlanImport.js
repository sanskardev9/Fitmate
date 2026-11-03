"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Upload, PencilLine, ChevronRight, ChevronLeft, Copy, Check, WandSparkles } from "lucide-react";
import AiCreate from "./AiCreate";
import { extractPdfLines } from "@/lib/import/pdfText";
import { detectKind, parseWorkout, parseDiet } from "@/lib/import/parsePlan";
import { parsePlanJson, downloadJson, WORKOUT_TEMPLATE, DIET_TEMPLATE } from "@/lib/import/parseJson";
import { importData } from "@/lib/services/backupService";
import { saveDraft } from "@/lib/import/draft";
import { extractJson } from "@/lib/import/extractJson";
import Segmented from "./Segmented";
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

  // Opened from a plan section (?kind=workout|diet): preselect that type.
  useEffect(() => {
    if (fixedKind) return;
    const k = new URLSearchParams(window.location.search).get("kind");
    if (k === "workout" || k === "diet") setKind(k);
  }, [fixedKind]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function openBuilder(type, draft) {
    saveDraft(type, draft);
    const path = type === "workout" ? "/plans/workout/new" : "/plans/diet/new";
    router.push(returnTo ? `${path}?return=${encodeURIComponent(returnTo)}` : path);
  }

  // A plan pasted from an AI chat (already parsed JSON).
  function importPasted(data) {
    const parsed = parsePlanJson(data);
    if (parsed.kind === "backup") throw new Error("That is a FitMate backup file. Use 'Upload PDF or JSON' instead.");
    openBuilder(parsed.kind, { name: parsed.name || `My ${parsed.kind} plan`, source: "your AI chat", days: parsed.days });
  }

  async function handle(file) {
    if (!file) return;
    const name = file.name.replace(/\.(pdf|json)$/i, "").replace(/[_-]+/g, " ").trim();
    setBusy(true);
    setStatus({ text: "Reading file…" });
    try {
      if (/\.json$/i.test(file.name) || file.type === "application/json") {
        const parsed = parsePlanJson(JSON.parse(await file.text()));
        if (parsed.kind === "backup") {
          if (!(await confirm({ title: "Restore this backup?", message: "It replaces all plans and history on this device with the ones in the file.", confirmLabel: "Restore", tone: "warn" }))) return setStatus(null);
          await importData(parsed.backup);
          setStatus({ text: "Backup restored." });
          onRestored?.();
          return;
        }
        if (fixedKind && parsed.kind !== fixedKind) throw new Error(`This file is a ${parsed.kind} plan, not a ${fixedKind} plan.`);
        return openBuilder(parsed.kind, { name: parsed.name || name, source: file.name, days: parsed.days });
      }

      if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") throw new Error("Please choose a PDF or JSON file.");
      const lines = await extractPdfLines(file);
      if (!lines.length) throw new Error("No text found in this PDF. It's probably a scanned image; please fill the plan in manually.");
      const type = kind === "auto" ? detectKind(lines) : kind;
      const days = type === "workout" ? parseWorkout(lines) : parseDiet(lines);
      if (!days.length) throw new Error(`Couldn't find any ${type === "workout" ? "exercises" : "meals"} in this PDF. Try 'Paste from AI' instead, it reads any format.`);
      openBuilder(type, { name, source: file.name, days });
    } catch (err) {
      setStatus({ error: true, text: err instanceof SyntaxError ? "That JSON file is not valid." : err.message || "Couldn't read this file." });
    } finally {
      setBusy(false);
    }
  }

  const [mode, setMode] = useState(null);
  const [pickManual, setPickManual] = useState(false);

  const kindsList = fixedKind ? [fixedKind] : kind === "diet" ? ["diet", "workout"] : ["workout", "diet"];
  if (mode === "create") return <AiCreate kinds={kindsList} onImport={importPasted} onBack={() => setMode(null)} />;
  if (mode) return <AiConvert kinds={fixedKind ? [fixedKind] : kind === "diet" ? ["diet", "workout"] : ["workout", "diet"]} onImport={importPasted} onBack={() => setMode(null)} />;

  return (
    <div className="space-y-2">
      <OptionRow Icon={WandSparkles} title="Create with AI" sub="No plan? AI builds one for you" tone="amber" onClick={() => setMode("create")} />
      <OptionRow Icon={Sparkles} title="Convert with AI" sub="Have a plan? Most accurate import" tone="violet" onClick={() => setMode("ai")} />
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`block cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <OptionRow as="div" Icon={Upload} title={busy ? "Reading…" : "Upload PDF or JSON"} sub="Your coach's plan or a file" tone="emerald" highlight={dragging} />
        <input
          type="file"
          accept="application/pdf,.pdf,application/json,.json"
          className="hidden"
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {manualHref || kind !== "auto" ? (
        <Link href={manualHref ?? `/plans/${kind}/new`} className="block">
          <OptionRow as="div" Icon={PencilLine} title="Type it in" sub="Build it yourself" tone="neutral" />
        </Link>
      ) : (
        <>
          <OptionRow Icon={PencilLine} title="Type it in" sub="Build it yourself" tone="neutral" onClick={() => setPickManual((v) => !v)} />
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
      {showGuide && (
        <details className="px-1 pt-2 text-sm">
          <summary className="cursor-pointer text-neutral-500">What should my PDF look like?</summary>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-neutral-100 p-3 text-xs whitespace-pre-wrap dark:bg-neutral-950">{FIELD_GUIDE[kind === "diet" ? "diet" : "workout"].example}</pre>
        </details>
      )}
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
  ],
  diet: [
    'One entry in "days" per day of the plan. If every day is the same, use one day with all seven weekdays.',
    '"slot" is one of Breakfast, Lunch, Snack, Dinner.',
    'Numbers only: "calories" in kcal, "proteinG", "carbsG", "fatG" in grams. If the plan does not give them, estimate them from the ingredients.',
    'Put ingredients and preparation steps in "recipe".',
    '"alternatives": 2 easy swap meals for the same slot with similar calories and protein (within ~10%), each {"name","serving","calories","proteinG","carbsG","fatG","recipe"}.',
    '"videoUrl": if you can search the web, look up a real YouTube video showing how to cook that exact dish (short, popular, simple) and add its link. Without web search, leave "videoUrl" out (FitMate finds a video itself). Never invent video IDs.',
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
- Reply with exactly ONE code block (${FENCE}json) and nothing else. No text before or after it.
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

// Paste from AI: copy our prompt, paste the AI's reply back. No files, exact data.
function AiConvert({ kinds, onImport, onBack }) {
  const [kind, setKind] = useState(kinds[0]);
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const prompt = aiPrompt(kind);

  function submit() {
    setError("");
    try {
      onImport(extractJson(reply));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="-ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {kinds.length > 1 && <Segmented options={[["workout", "Workout"], ["diet", "Diet"]]} value={kind} onChange={(k) => { setKind(k); setCopied(false); }} />}
      </div>

      <Step n={1} text="Copy the prompt and send it to ChatGPT, Claude or Gemini with your plan." />
      <button
        type="button"
        onClick={async () => setCopied(await copyText(prompt))}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${copied ? "bg-emerald-600" : "bg-violet-600 active:bg-violet-700"}`}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Prompt copied" : "Copy prompt"}
      </button>

      <div className="mt-5">
        <Step n={2} text="Tap Copy on the AI's code block and paste it here." />
        <textarea
          value={reply}
          onChange={(e) => {
            setReply(e.target.value);
            setError("");
          }}
          rows={4}
          placeholder="Paste the reply…"
          className="mt-2 w-full rounded-xl border border-neutral-300 bg-white p-3 font-mono text-xs outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-950"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        <button type="button" disabled={!reply.trim()} onClick={submit} className="mt-2 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900">
          Import
        </button>
      </div>

      <div className="mt-4 flex gap-4 text-xs text-neutral-500">
        <details>
          <summary className="cursor-pointer">See prompt</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-neutral-100 p-3 text-[11px] whitespace-pre-wrap dark:bg-neutral-950">{prompt}</pre>
        </details>
        <button type="button" onClick={() => downloadJson(kind === "workout" ? WORKOUT_TEMPLATE : DIET_TEMPLATE, `fitmate-${kind}-sample.json`)} className="self-start">
          Sample file ↓
        </button>
      </div>
    </div>
  );
}

function Step({ n, text }) {
  return (
    <p className="flex items-start gap-2 text-sm font-medium">
      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] text-white">{n}</span>
      {text}
    </p>
  );
}

function FieldList({ title, items, required }) {
  return (
    <div>
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
