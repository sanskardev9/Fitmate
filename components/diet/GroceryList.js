"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ShoppingBasket, Share2, Copy, Check, RotateCcw } from "lucide-react";
import { getPreferences } from "@/lib/services/preferencesService";
import { upcomingMeals, groceryList, amountLabel } from "@/lib/diet/groceries";
import Segmented from "@/components/common/Segmented";
import { copyText } from "@/components/common/PlanImport";

// Everything to buy for the next few days, added up from the plan's recipes. Tick items off while
// shopping (remembered on this device for this shopping window); share or copy as plain text.
export default function GroceryList() {
  const [range, setRange] = useState("7");
  const data = useLiveQuery(async () => {
    const prefs = await getPreferences();
    if (!prefs.activeDietPlanId) return { none: true };
    const days = await upcomingMeals(prefs.activeDietPlanId, Number(range));
    return { days, list: groceryList(days) };
  }, [range]);

  const storeKey = data?.days ? `fitmate:groceries:${data.days[0].key}:${range}` : null;
  const [checked, setChecked] = useState({});
  const [copied, setCopied] = useState(false);
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
    const lines = [`Groceries for ${range === "3" ? "the next 3 days" : "the week"}`];
    for (const g of data.list.groups) {
      lines.push("", g.name.toUpperCase());
      for (const it of g.items) lines.push(`- ${it.name}: ${amountLabel(it)}`);
    }
    return lines.join("\n");
  }, [data, range]);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Grocery list", text });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    copy();
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
        <Segmented options={[["3", "Next 3 days"], ["7", "Next 7 days"]]} value={range} onChange={setRange} />
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

  const { list } = data;
  const all = list.groups.flatMap((g) => g.items.map((it) => `${g.name}|${it.name}|${it.unit}`));
  const done = all.filter((k) => checked[k]).length;

  return (
    <>
      {header}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm">
        <span>
          <b className="tabular-nums">{all.length}</b> items for <b className="tabular-nums">{list.meals}</b> meals
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
          <button type="button" onClick={share} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </span>
      </div>

      {list.groups.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
          Your meals don&apos;t list ingredients yet. Plans made with &ldquo;Make me a plan&rdquo; include them.
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
                  const k = `${g.name}|${it.name}|${it.unit}`;
                  const on = Boolean(checked[k]);
                  return (
                    <li key={k}>
                      <button type="button" onClick={() => toggle(k)} aria-pressed={on} className="flex w-full items-center gap-3 rounded-lg py-2 text-left">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 dark:border-neutral-600"}`}>
                          {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                        <span className={`min-w-0 flex-1 text-sm break-words capitalize ${on ? "text-neutral-400 line-through" : ""}`}>{it.name}</span>
                        <span className={`shrink-0 text-right text-sm font-semibold tabular-nums ${on ? "text-neutral-400" : ""}`}>
                          {amountLabel(it)}
                          <span className="block text-[11px] font-normal text-neutral-500">
                            {it.uses} {it.uses === 1 ? "meal" : "meals"}
                          </span>
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
