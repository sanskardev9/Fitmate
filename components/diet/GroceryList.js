"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ShoppingBasket, Share2, Copy, Check, RotateCcw, Sparkles } from "lucide-react";
import { db } from "@/lib/db/dexie";
import { getPreferences } from "@/lib/services/preferencesService";
import { GROUPS } from "@/lib/diet/groceries";
import { groceriesOf } from "@/lib/import/parseJson";
import { extractJson } from "@/lib/import/extractJson";
import { AI_RULES, FENCE, copyText } from "@/components/common/PlanImport";
import AiLinks from "@/components/common/AiLinks";
import AiWaitHint from "@/components/common/AiWaitHint";
import { WEEKDAYS } from "@/lib/utils";

// The week's grocery list, written by the AI with the diet plan (shop sizes, staples included).
// Plans made before that get it once: FitMate sends the plan's meals to the AI and saves the reply.
// Tick items off while shopping (remembered on this device); share, WhatsApp or copy as text.

const GROCERY_RULE = AI_RULES.diet.find((r) => r.startsWith("GROCERIES"));

function groceryPrompt(plan, days, meals) {
  const lines = days.map((d) => {
    const when = (d.weekdays ?? []).map((w) => WEEKDAYS[w]).join(", ") || "every day";
    const items = meals
      .filter((m) => m.dayId === d.id)
      .map((m) => {
        const ing = String(m.recipe ?? "")
          .split("\n")
          .find((l) => /^\s*ingredients\s*:/i.test(l));
        return `  - ${m.slot || "Meal"}: ${m.name}${m.serving ? ` (${m.serving})` : ""}${ing ? `. ${ing.trim()}` : ""}`;
      });
    return `Day "${d.name}" (${when}):\n${items.join("\n")}`;
  });
  return `Write the weekly grocery list for my diet plan "${plan.name}" for the FitMate app.

Reply format: start IMMEDIATELY with exactly this line: "⏳ Making your grocery list. This takes about a minute.", then exactly ONE ${FENCE}json code block with {"groceries": [...]}, then nothing else. Don't search the web.

Rules:
- ${GROCERY_RULE.replace(/^GROCERIES: add a top-level "groceries" list = /, "The list = ")}
- Count each day as many times as its weekdays (a day used on 3 weekdays is cooked 3 times). Add up every ingredient across the whole week, then round up to shop sizes.
- Keep each item on one line, exactly like: {"item": "Paneer (low-fat)", "amount": "1 kg", "group": "Dairy & eggs"}

My plan:
${lines.join("\n\n")}`;
}

export default function GroceryList() {
  const data = useLiveQuery(async () => {
    const prefs = await getPreferences();
    if (!prefs.activeDietPlanId) return { none: true };
    const plan = await db.dietPlans.get(prefs.activeDietPlanId);
    if (!plan) return { none: true };
    const [days, meals] = await Promise.all([db.dietDays.where("planId").equals(plan.id).sortBy("order"), db.meals.where("planId").equals(plan.id).toArray()]);
    return { plan, days, meals };
  }, []);

  const items = useMemo(() => data?.plan?.groceries ?? [], [data]);
  const groups = useMemo(() => {
    const order = [...GROUPS.map(([g]) => g), "Other"];
    const by = {};
    for (const it of items) (by[it.group] ??= []).push(it);
    return order.filter((g) => by[g]).map((g) => ({ name: g, items: by[g] }));
  }, [items]);

  const storeKey = data?.plan ? `fitmate:groceries:plan:${data.plan.id}` : null;
  const [checked, setChecked] = useState({});
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState("");
  useEffect(() => {
    if (!storeKey) return;
    try {
      setChecked(JSON.parse(localStorage.getItem(storeKey) ?? "{}"));
    } catch {
      setChecked({});
    }
  }, [storeKey]);
  const toggle = (k) =>
    setChecked((c) => {
      const next = { ...c, [k]: !c[k] };
      try {
        localStorage.setItem(storeKey, JSON.stringify(next));
      } catch {}
      return next;
    });

  const text = useMemo(() => {
    const lines = ["Groceries for the week"];
    for (const g of groups) {
      lines.push("", g.name.toUpperCase());
      for (const it of g.items) lines.push(`- ${it.item}: ${it.amount}`);
    }
    return lines.join("\n");
  }, [groups]);

  async function copy() {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }
  // Share menu where the device has one (phones, Safari); otherwise copy and say so.
  async function share() {
    setShareNote("");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Grocery list", text });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    await copy();
    setShareNote("This browser has no share menu, so the list is copied. Paste it anywhere.");
  }

  const header = (
    <div className="mb-5">
      <Link href="/diet" className="-ml-1 inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
        <ChevronLeft className="h-4 w-4" /> Diet
      </Link>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <ShoppingBasket className="h-6 w-6 text-emerald-600" /> Grocery list
      </h1>
      {data?.plan && <p className="mt-1 text-sm text-neutral-500">For one week of {data.plan.name}</p>}
    </div>
  );

  if (!data) return header;
  if (data.none)
    return (
      <>
        {header}
        <p className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">Add a diet plan first. Its grocery list comes with it.</p>
      </>
    );

  if (!items.length) return (<>{header}<GetList plan={data.plan} days={data.days} meals={data.meals} /></>);

  const all = groups.flatMap((g) => g.items.map((it) => `${g.name}|${it.item}`));
  const done = all.filter((k) => checked[k]).length;

  return (
    <>
      {header}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm">
        <span>
          <b className="tabular-nums">{all.length}</b> items for the week
          {done > 0 && <span className="text-neutral-500 tabular-nums"> · {done} in the basket</span>}
        </span>
        <span className="flex gap-2">
          {done > 0 && (
            <button
              type="button"
              onClick={() => {
                setChecked({});
                try {
                  localStorage.removeItem(storeKey);
                } catch {}
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-300 px-3 text-xs font-semibold dark:border-neutral-700"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          <button type="button" onClick={copy} aria-label="Copy list" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-300 px-3 text-xs font-semibold dark:border-neutral-700">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" aria-label="Send on WhatsApp" title="WhatsApp" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#25D366" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" />
            </svg>
          </a>
          <button type="button" onClick={share} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </span>
      </div>
      {shareNote && <p className="-mt-2 mb-3 text-xs text-emerald-700 dark:text-emerald-400">{shareNote}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {groups.map((g) => (
          <section key={g.name} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              {g.name} <span className="font-normal tabular-nums">· {g.items.length}</span>
            </h2>
            <ul>
              {g.items.map((it) => {
                const k = `${g.name}|${it.item}`;
                const on = Boolean(checked[k]);
                return (
                  <li key={k}>
                    <button type="button" onClick={() => toggle(k)} aria-pressed={on} className="flex w-full items-center gap-3 rounded-lg py-2 text-left">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 dark:border-neutral-600"}`}>
                        {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className={`min-w-0 flex-1 text-sm break-words ${on ? "text-neutral-400 line-through" : ""}`}>{it.item}</span>
                      <span className={`shrink-0 text-right text-sm font-semibold tabular-nums ${on ? "text-neutral-400" : ""}`}>{it.amount}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

// Older plan without a grocery list: ask the AI once, save its reply with the plan.
function GetList({ plan, days, meals }) {
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const prompt = useMemo(() => groceryPrompt(plan, days, meals), [plan, days, meals]);

  async function save() {
    setError("");
    try {
      const parsed = extractJson(reply);
      const list = groceriesOf(Array.isArray(parsed) ? parsed : parsed?.groceries);
      if (!list.length) throw new Error("No grocery items found in that reply. Copy the whole reply, including the code block.");
      setSaving(true);
      await db.dietPlans.update(plan.id, { groceries: list, updatedAt: Date.now() });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
        <Sparkles className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-lg font-semibold">Get your grocery list</h2>
      <p className="mt-1 text-sm text-neutral-500">This plan was made before grocery lists. The AI writes one from your meals in shop sizes (1 kg onions, 1 dozen eggs, a 500 ml bottle of oil), once, and it&apos;s saved with your plan.</p>

      <p className="mt-5 text-sm font-semibold">1. Send your meals to any AI</p>
      <button type="button" onClick={async () => setCopied(await copyText(prompt))} className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${copied ? "bg-emerald-600" : "bg-violet-600 active:bg-violet-700"}`}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Prompt copied" : "Copy prompt"}
      </button>
      <AiLinks prompt={prompt} onCopied={() => setCopied(true)} />

      <p className="mt-5 text-sm font-semibold">2. Paste its reply</p>
      <div className="mt-2">
        <AiWaitHint minutes="1" />
      </div>
      <textarea value={reply} onChange={(e) => { setReply(e.target.value); setError(""); }} rows={4} placeholder="Paste the whole reply here…" className="w-full rounded-xl border border-neutral-300 bg-white p-3 font-mono text-xs outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-950" />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <button type="button" disabled={!reply.trim() || saving} onClick={save} className="mt-2 w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900">
        {saving ? "Saving…" : "Save grocery list"}
      </button>
    </div>
  );
}
