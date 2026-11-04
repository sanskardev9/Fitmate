"use client";

import { useEffect } from "react";
import { ArrowLeftRight, X } from "lucide-react";

// Pick an alternative for an exercise in today's workout (the plan itself doesn't change).
export default function SwapSheet({ exercise, onPick, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const target = (a) => (a.type === "hold" || (a.holdSec && !a.reps) ? `${a.holdSec ?? "–"}s hold` : `${a.reps ?? "–"} reps`);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div role="dialog" aria-label={`Swap ${exercise.name}`} onClick={(e) => e.stopPropagation()} className="animate-fade-up w-full max-w-md rounded-t-3xl bg-[var(--background)] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl [animation-duration:200ms] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Swap for today</p>
            <h2 className="mt-0.5 font-semibold break-words">{exercise.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {exercise.alternatives.map((a) => (
            <li key={a.name}>
              <button type="button" onClick={() => onPick(a)} className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 p-3.5 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-500/5 dark:border-neutral-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ArrowLeftRight className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold break-words">{a.name}</span>
                  <span className="block text-xs text-neutral-500">
                    {a.sets ?? exercise.sets} × {target(a)}
                    {a.notes ? ` · ${a.notes}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-500">Only for this workout. Your plan stays the same, and your log records what you actually did.</p>
      </div>
    </div>
  );
}
