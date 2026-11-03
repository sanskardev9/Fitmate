"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getRest, subscribeRest, remainingMs, adjustRest, togglePause, skipRest, markRestDone, restAlert } from "@/lib/workout/restTimer";
import { formatDuration } from "@/lib/utils";

const useRest = () => useSyncExternalStore(subscribeRest, getRest, () => null);

// Pinned rest timer for the workout screen. Tap the time to go full screen.
export default function RestTimerBar({ next }) {
  const rest = useRest();
  const [, setTick] = useState(0);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!rest || rest.done) return;
    const id = setInterval(() => {
      setTick((n) => n + 1);
      if (rest.pausedRemaining == null && remainingMs(rest) <= 0) {
        markRestDone();
        restAlert();
      }
    }, 250);
    return () => clearInterval(id);
  }, [rest]);

  // "Go" message disappears on its own.
  useEffect(() => {
    if (!rest?.done) return;
    const t = setTimeout(skipRest, 6000);
    return () => clearTimeout(t);
  }, [rest?.done]);

  if (!rest) return null;
  const left = remainingMs(rest);
  const pct = rest.total ? Math.min(100, ((rest.total - left) / rest.total) * 100) : 100;
  const paused = rest.pausedRemaining != null;

  if (rest.done) {
    return (
      <div className="animate-fade-up fixed inset-x-0 bottom-0 z-40 bg-emerald-600 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-white shadow-2xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">Rest over. Go!</p>
            {next && <p className="text-sm text-emerald-100">Next: {next}</p>}
          </div>
          <button type="button" onClick={skipRest} className="rounded-xl bg-white/20 px-4 py-2.5 font-semibold">
            OK
          </button>
        </div>
      </div>
    );
  }

  const controls = (big) => (
    <div className={`flex items-center ${big ? "gap-4" : "gap-2"}`}>
      <RoundBtn big={big} onClick={() => adjustRest(-15)} label="−15" />
      <RoundBtn big={big} onClick={togglePause} label={paused ? "▶" : "❚❚"} aria={paused ? "Resume" : "Pause"} />
      <RoundBtn big={big} onClick={() => adjustRest(15)} label="+15" />
      <button type="button" onClick={skipRest} className={`rounded-xl bg-white/10 font-semibold ${big ? "px-6 py-4 text-lg" : "px-3 py-2.5 text-sm"}`}>
        Skip
      </button>
    </div>
  );

  if (full) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-neutral-950 px-6 text-white">
        <p className="text-sm tracking-widest text-neutral-400 uppercase">Rest{rest.label ? ` · after ${rest.label}` : ""}</p>
        <div className="relative h-72 w-72">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" className="stroke-neutral-800" />
            <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={pct} className="stroke-emerald-500 transition-[stroke-dashoffset] duration-300" />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-7xl font-semibold tabular-nums ${paused ? "text-neutral-500" : ""}`}>{formatDuration(left / 1000)}</span>
        </div>
        {next && <p className="text-neutral-400">Next: {next}</p>}
        {controls(true)}
        <button type="button" onClick={() => setFull(false)} className="text-sm text-neutral-400">
          Minimise
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-neutral-900 pb-[env(safe-area-inset-bottom)] text-white shadow-2xl">
      <div className="h-1 bg-neutral-800">
        <div className="h-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => setFull(true)} className="text-left" aria-label="Full screen timer">
          <span className="block text-[11px] tracking-wider text-neutral-400 uppercase">{paused ? "Paused" : "Rest"}</span>
          <span className={`block text-3xl leading-none font-semibold tabular-nums ${paused ? "text-neutral-500" : ""}`}>{formatDuration(left / 1000)}</span>
        </button>
        {controls(false)}
      </div>
    </div>
  );
}

function RoundBtn({ onClick, label, aria, big }) {
  return (
    <button type="button" onClick={onClick} aria-label={aria ?? label} className={`flex items-center justify-center rounded-full bg-white/10 font-semibold tabular-nums active:bg-white/20 ${big ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm"}`}>
      {label}
    </button>
  );
}
