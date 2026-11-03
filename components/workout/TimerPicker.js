"use client";

import { useEffect, useState } from "react";
import { startRest, unlockAudio, getAutoRest, setAutoRest } from "@/lib/workout/restTimer";
import Switch from "@/components/common/Switch";

const PRESETS = [
  [30, "30s"],
  [60, "1 min"],
  [90, "90s"],
  [120, "2 min"],
  [180, "3 min"],
  [300, "5 min"],
];

// Manual timer: pick a duration yourself, and choose whether sets start the rest timer automatically.
export default function TimerPicker({ onClose }) {
  const [min, setMin] = useState("");
  const [sec, setSec] = useState("");
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    getAutoRest().then(setAuto);
  }, []);

  function go(seconds) {
    if (!seconds) return;
    unlockAudio();
    startRest(seconds, "Timer");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="animate-fade-up w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Start a timer</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-neutral-400">
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {PRESETS.map(([s, label]) => (
            <button key={s} type="button" onClick={() => go(s)} className="rounded-2xl bg-neutral-100 py-4 text-lg font-semibold tabular-nums active:bg-emerald-500 active:text-white dark:bg-neutral-800">
              {label}
            </button>
          ))}
        </div>

        <form
          className="mt-4 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go((Number(min) || 0) * 60 + (Number(sec) || 0));
          }}
        >
          <input type="number" inputMode="numeric" min="0" max="59" value={min} onChange={(e) => setMin(e.target.value)} placeholder="min" className="h-12 w-20 rounded-xl border border-neutral-300 bg-transparent text-center text-lg tabular-nums outline-none focus:border-emerald-500 dark:border-neutral-700" />
          <span className="text-lg text-neutral-400">:</span>
          <input type="number" inputMode="numeric" min="0" max="59" value={sec} onChange={(e) => setSec(e.target.value)} placeholder="sec" className="h-12 w-20 rounded-xl border border-neutral-300 bg-transparent text-center text-lg tabular-nums outline-none focus:border-emerald-500 dark:border-neutral-700" />
          <button type="submit" className="h-12 flex-1 rounded-xl bg-emerald-600 font-semibold text-white">
            Start
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-950">
          <span>
            <span className="block text-sm font-medium">Start rest automatically</span>
            <span className="block text-xs text-neutral-500">After each logged set, using that exercise&apos;s rest time.</span>
          </span>
          <Switch
            checked={auto}
            label="Start rest automatically"
            onChange={(on) => {
              setAuto(on);
              setAutoRest(on);
            }}
          />
        </div>
      </div>
    </div>
  );
}
