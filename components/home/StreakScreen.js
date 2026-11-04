"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { X, ChevronLeft, ChevronRight, CircleCheck, Trophy, Snowflake } from "lucide-react";
import { loadStreak, monthStatuses, MAX_FREEZES, FREEZE_EVERY } from "@/lib/services/streak";
import { Flame } from "./HomeToday";

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// Full-screen streak view: big count, a message, and a month calendar where
// consecutive followed days join into one orange band.
export default function StreakScreen() {
  const router = useRouter();
  const now = new Date();
  const [ym, setYm] = useState([now.getFullYear(), now.getMonth()]);
  const streak = useLiveQuery(() => loadStreak(), []);
  const frozenSig = streak?.frozenKeys.join(",") ?? "";
  const month = useLiveQuery(() => monthStatuses(ym[0], ym[1], frozenSig ? frozenSig.split(",") : []), [ym[0], ym[1], frozenSig]);

  const isCurrentMonth = ym[0] === now.getFullYear() && ym[1] === now.getMonth();
  const shift = (n) => setYm(([y, m]) => {
    const d = new Date(y, m + n, 1);
    return [d.getFullYear(), d.getMonth()];
  });

  const lit = streak && (streak.current > 0 || streak.today.status === "done");
  const message = !streak
    ? ""
    : streak.today.status === "done"
      ? "You followed your plan today. See you tomorrow!"
      : streak.today.status === "rest"
        ? "Rest day. Your streak is safe."
        : streak.current > 0
          ? `Follow today's plan before midnight to make it ${streak.current + 1}.`
          : "Follow today's plan to start a streak.";

  const lead = month ? (month[0].date.getDay() + 6) % 7 : 0;
  const cells = month ? [...Array(lead).fill(null), ...month] : [];
  const followed = month?.filter((d) => d.status === "done").length ?? 0;
  const missed = month?.filter((d) => d.status === "missed").length ?? 0;
  const frozenCount = month?.filter((d) => d.status === "frozen").length ?? 0;

  return (
    <div className="min-h-dvh bg-[var(--background)] pb-10">
      <header className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <button type="button" onClick={() => router.back()} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900">
          <X className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold">Streak</h1>
        <span className="w-11" />
      </header>

      <main className="mx-auto max-w-xl px-4">
        <section className={`animate-fade-up relative overflow-hidden rounded-3xl p-6 ${lit ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white" : "bg-neutral-100 dark:bg-neutral-900"}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-7xl leading-none font-extrabold tracking-tight tabular-nums">{streak?.current ?? "–"}</p>
              <p className={`mt-1 text-xl font-bold ${lit ? "text-white/90" : "text-neutral-500"}`}>day streak!</p>
            </div>
            <Flame lit={lit} className={`h-28 w-28 shrink-0 ${lit ? "drop-shadow-[0_8px_20px_rgba(0,0,0,0.25)] [&_path:first-child]:fill-white/95 [&_path:last-child]:fill-orange-300" : ""}`} />
          </div>
          <p className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${lit ? "bg-black/15" : "bg-white dark:bg-neutral-800"}`}>{message}</p>
        </section>

        {streak && <Freezes streak={streak} />}

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{new Date(ym[0], ym[1], 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
            <div className="flex gap-1">
              <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => shift(1)} disabled={isCurrentMonth} aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-900">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat Icon={CircleCheck} tint="text-orange-500" value={followed} label="Days followed" />
            <Stat Icon={Trophy} tint="text-amber-500" value={streak?.best ?? 0} label="Best streak" />
          </div>

          <div className="mt-4 rounded-3xl border border-neutral-200 p-3 sm:p-4 dark:border-neutral-800">
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-neutral-500">
              {DOW.map((d) => (
                <span key={d} className="py-2">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-2">
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const col = i % 7;
                const kept = (x) => x?.status === "done" || x?.status === "frozen";
                const done = kept(d);
                const prevDone = col > 0 && kept(cells[i - 1]);
                const nextDone = col < 6 && kept(cells[i + 1]);
                const frozen = d.status === "frozen";
                return (
                  <div key={d.key} className="relative flex h-11 items-center justify-center" title={`${d.date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}: ${LABEL[d.status]}`}>
                    {done && (
                      <span
                        className={`absolute inset-y-0 bg-gradient-to-r ${frozen ? "from-sky-400 to-sky-300" : "from-orange-500 to-amber-400"} ${!prevDone && !nextDone ? "left-1/2 w-11 -translate-x-1/2 rounded-full" : `${prevDone ? "left-0" : "left-1 rounded-l-full"} ${nextDone ? "right-0" : "right-1 rounded-r-full"}`}`}
                      />
                    )}
                    <span
                      className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                        done ? "text-white" : d.isToday ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900" : d.status === "missed" ? "text-rose-400" : d.status === "future" ? "text-neutral-400 dark:text-neutral-600" : "text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {frozen ? <Snowflake className="h-4 w-4" /> : d.date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400" /> Followed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Missed{missed ? ` · ${missed} this month` : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <Snowflake className="h-3 w-3 text-sky-500" /> Freeze used{frozenCount ? ` · ${frozenCount}` : ""}
            </span>
            <span>Rest days never break a streak</span>
          </p>
        </section>
      </main>
    </div>
  );
}

const LABEL = { done: "followed", missed: "missed", frozen: "saved by a streak freeze", rest: "rest day", pending: "today, not done yet", future: "upcoming" };

// Freezes you hold (max 2), how they work, and progress to the next one.
// One quiet line: freezes held (max 2) and when the next one comes. Tap for how they work.
function Freezes({ streak }) {
  const { freezes, nextFreezeIn } = streak;
  return (
    <details className="group mt-3 rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800">
      <summary className="flex cursor-pointer list-none items-center gap-2.5">
        <span className="flex gap-1">
          {Array.from({ length: MAX_FREEZES }, (_, i) => (
            <Snowflake key={i} className={`h-4 w-4 ${i < freezes ? "text-sky-500" : "text-neutral-300 dark:text-neutral-700"}`} />
          ))}
        </span>
        <span className="font-medium">
          {freezes} streak freeze{freezes === 1 ? "" : "s"}
        </span>
        <span className="ml-auto text-xs text-neutral-500">{nextFreezeIn == null ? "Max held" : `Next in ${nextFreezeIn}d`}</span>
      </summary>
      <p className="mt-2 text-xs text-neutral-500">A missed planned day uses one automatically, so your streak survives. Earn 1 every {FREEZE_EVERY} days in a row, hold up to {MAX_FREEZES}.</p>
    </details>
  );
}

function Stat({ Icon, tint, value, label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <Icon className={`h-6 w-6 shrink-0 ${tint}`} />
      <span>
        <span className="block text-xl font-bold tabular-nums">{value}</span>
        <span className="block text-xs text-neutral-500">{label}</span>
      </span>
    </div>
  );
}
