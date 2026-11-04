"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { Trophy, Dumbbell, Utensils, Scale, ArrowRight } from "lucide-react";
import { blockReview, markReviewed } from "@/lib/workout/blockReview";
import { setPreference } from "@/lib/services/preferencesService";

// End of a 4-week block: your numbers, then one tap to build the next block from them.
export default function BlockReviewCard() {
  const router = useRouter();
  const r = useLiveQuery(() => blockReview(), []);
  if (!r) return null;

  async function buildNext() {
    await setPreference("nextBlockContext", r.summary);
    await markReviewed(r.planId, r.block);
    router.push("/plans/import?start=create");
  }

  const stat = (Icon, value, label) => (
    <div className="rounded-2xl bg-white/70 p-3 dark:bg-neutral-950/50">
      <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <p className="mt-1 text-lg leading-tight font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-neutral-500">{label}</p>
    </div>
  );

  return (
    <section className="animate-fade-up overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-400/15 via-white to-white p-5 dark:via-neutral-900 dark:to-neutral-900">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/30">
          <Trophy className="h-6 w-6" />
        </span>
        <div>
          <p className="text-lg font-bold">Block {r.block} done</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">4 weeks of work. Here&apos;s what changed.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {stat(Dumbbell, `${r.workouts.done}/${r.workouts.planned}`, "workouts")}
        {stat(Utensils, `${r.dietDays}/28`, "diet days")}
        {stat(Scale, r.weight ? `${r.weight.to - r.weight.from > 0 ? "+" : ""}${(r.weight.to - r.weight.from).toFixed(1)} kg` : "–", "weight")}
      </div>

      {r.improved.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {r.improved.slice(0, 4).map((x) => (
            <li key={x.name} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-medium">{x.name}</span>
              <span className="shrink-0 text-neutral-500 tabular-nums">
                {x.from} <span className="text-emerald-600 dark:text-emerald-400">→ {x.to}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={buildNext} className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-bold text-white shadow-[0_4px_0_#c2410c] active:translate-y-0.5 active:shadow-[0_2px_0_#c2410c]">
          Build my next block <ArrowRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => markReviewed(r.planId, r.block)} className="rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
          Keep my plans (they keep progressing)
        </button>
      </div>
      <p className="mt-2 text-xs text-neutral-500">The next block uses these results: harder where you improved, calories from your weight, and none of the meals you kept swapping.</p>
    </section>
  );
}
