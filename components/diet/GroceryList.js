"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ShoppingBasket, Share2, Copy, Check, RotateCcw } from "lucide-react";
import { getPreferences } from "@/lib/services/preferencesService";
import { db } from "@/lib/db/dexie";
import { GROUPS } from "@/lib/diet/groceries";
import { upcomingMeals, groceryList, amountLabel } from "@/lib/diet/groceries";
import Segmented from "@/components/common/Segmented";
import { copyText } from "@/components/common/PlanImport";

// What to buy. "From your plan" = the weekly list the AI wrote with the plan (shop sizes, staples
// included). "From recipes" = FitMate adds up the recipes for the next 3 or 7 days (older plans).
// Tick items off while shopping (remembered on this device); share or copy as plain text.
export default function GroceryList() {
  const [range, setRange] = useState("7");
  const [source, setSource] = useState(null); // "plan" | "recipes" (null = best available)
  const data = useLiveQuery(async () => {
    const prefs = await getPreferences();
    if (!prefs.activeDietPlanId) return { none: true };
    const [days, plan] = await Promise.all([upcomingMeals(prefs.activeDietPlanId, Number(range)), db.dietPlans.get(prefs.activeDietPlanId)]);
    return { days, plan, list: groceryList(days) };
  }, [range]);

  const aiItems = useMemo(() => data?.plan?.groceries ?? [], [data]);
  const mode = source ?? (aiItems.length ? "plan" : "recipes");
  // The plan's list as groups in the usual order.
  const aiList = useMemo(() => {
    const order = [...GROUPS.map(([g]) => g), "Other"];
    const by = {};
    for (const it of aiItems) (by[it.group] ??= []).push({ name: it.item, label: it.amount });
    return { groups: order.filter((g) => by[g]).map((g) => ({ name: g, items: by[g] })) };
  }, [aiItems]);

  const storeKey = data?.days ? (mode === "plan" ? `fitmate:groceries:plan:${data.plan?.id}:${data.days[0].key}` : `fitmate:groceries:${data.days[0].key}:${range}`) : null;
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
    if (!data?.list) return "";
    const groups = mode === "plan" ? aiList.groups : data.list.groups;
    const lines = [`Groceries for ${mode === "plan" || range === "7" ? "the week" : "the next 3 days"}`];
    for (const g of groups) {
      lines.push("", g.name.toUpperCase());
      for (const it of g.items) lines.push(`- ${it.name}: ${it.label ?? amountLabel(it)}`);
    }
    return lines.join("\n");
  }, [data, range, mode, aiList]);

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
  async function copy() {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const header = (
    <div className="mb-5">
      <Link href="/diet" className="-ml-1 inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
        <ChevronLeft className="h-4 w-4" /> Diet
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShoppingBasket className="h-6 w-6 text-emerald-600" /> Grocery list
        </h1>
        {mode === "recipes" && <Segmented options={[["3", "Next 3 days"], ["7", "Next 7 days"]]} value={range} onChange={setRange} />}
      </div>
    </div>
  );

  if (!data) return header;
  if (data.none)
    return (
      <>
        {header}
        <p className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">Add a diet plan first, then your grocery list builds itself.</p>
      </>
    );

  const list = mode === "plan" ? { ...aiList, meals: data.list.meals, unparsed: 0 } : data.list;
  const all = list.groups.flatMap((g) => g.items.map((it) => `${g.name}|${it.name}|${it.unit ?? ""}`));
  const done = all.filter((k) => checked[k]).length;

  return (
    <>
      {header}
      {aiItems.length > 0 && (
        <div className="mb-3">
          <Segmented
            options={[
              ["plan", "From your plan"],
              ["recipes", "From recipes"],
            ]}
            value={mode}
            onChange={setSource}
          />
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm">
        <span>
          <b className="tabular-nums">{all.length}</b> items {mode === "plan" ? "for the week, in shop sizes" : <>for <b className="tabular-nums">{list.meals}</b> meals</>}
          {done > 0 && <span className="text-neutral-500 tabular-nums"> · {done} in the basket</span>}
        </span>
        <span className="flex gap-2">
          {done > 0 && (
            <button type="button" onClick={() => { setChecked({}); try { localStorage.removeItem(storeKey); } catch {} }} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-300 px-3 text-xs font-semibold dark:border-neutral-700">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          <button type="button" onClick={copy} aria-label="Copy list" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-300 px-3 text-xs font-semibold dark:border-neutral-700">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Send on WhatsApp"
            title="WhatsApp"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
          >
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

      {list.groups.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
          Your meals don&apos;t list ingredients yet. New plans from &ldquo;Make me a plan&rdquo; come with a full grocery list.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.groups.map((g) => (
            <section key={g.name} className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                {g.name} <span className="font-normal tabular-nums">· {g.items.length}</span>
              </h2>
              <ul>
                {g.items.map((it) => {
                  const k = `${g.name}|${it.name}|${it.unit ?? ""}`;
                  const on = Boolean(checked[k]);
                  return (
                    <li key={k}>
                      <button type="button" onClick={() => toggle(k)} aria-pressed={on} className="flex w-full items-center gap-3 rounded-lg py-2 text-left">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 dark:border-neutral-600"}`}>
                          {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                        <span className={`min-w-0 flex-1 text-sm break-words capitalize ${on ? "text-neutral-400 line-through" : ""}`}>{it.name}</span>
                        <span className={`shrink-0 text-right text-sm font-semibold tabular-nums ${on ? "text-neutral-400" : ""}`}>
                          {it.label ?? amountLabel(it)}
                          {it.uses != null && (
                            <span className="block text-[11px] font-normal text-neutral-500">
                              {it.uses} {it.uses === 1 ? "meal" : "meals"}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      {list.unparsed > 0 && list.groups.length > 0 && (
        <p className="mt-3 text-xs text-neutral-500">
          {list.unparsed} {list.unparsed === 1 ? "meal doesn't" : "meals don't"} list ingredients, so {list.unparsed === 1 ? "it isn't" : "they aren't"} counted here.
        </p>
      )}
    </>
  );
}
