"use client";

import { useEffect, useState } from "react";

// Clock-face time picker (like Android's): tap the hour, then the minutes, pick AM/PM, save.
// value / onSave use "HH:MM" (24 h).
const pad = (n) => String(n).padStart(2, "0");

export default function TimeDial({ value = "07:00", title = "Pick a time", onSave, onClose }) {
  const [h24, m0] = String(value).split(":").map(Number);
  const [hour, setHour] = useState(h24 % 12 || 12); // 1..12
  const [minute, setMinute] = useState(Math.round((m0 || 0) / 5) * 5 % 60);
  const [pm, setPm] = useState(h24 >= 12);
  const [mode, setMode] = useState("hour"); // "hour" | "minute"

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const values = mode === "hour" ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const selected = mode === "hour" ? hour : minute;
  const angle = (values.indexOf(selected) / 12) * 360; // 0 = top
  const R = 104; // number ring radius (dial is 256 px)

  function pick(v) {
    if (mode === "hour") {
      setHour(v);
      setMode("minute"); // then minutes, like a real clock picker
    } else setMinute(v);
  }
  function save() {
    const h = (hour % 12) + (pm ? 12 : 0);
    onSave(`${pad(h)}:${pad(minute)}`);
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()} className="animate-fade-up w-full max-w-sm rounded-t-3xl bg-[var(--background)] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl [animation-duration:200ms] sm:rounded-3xl">
        <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{title}</p>

        {/* Big readout: tap hour or minutes to switch the dial */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1 text-5xl font-bold tabular-nums">
            <button type="button" onClick={() => setMode("hour")} className={`rounded-xl px-2 py-1 transition-colors ${mode === "hour" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"}`}>
              {pad(hour)}
            </button>
            <span className="text-neutral-300 dark:text-neutral-600">:</span>
            <button type="button" onClick={() => setMode("minute")} className={`rounded-xl px-2 py-1 transition-colors ${mode === "minute" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"}`}>
              {pad(minute)}
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {[
              [false, "AM"],
              [true, "PM"],
            ].map(([v, l]) => (
              <button key={l} type="button" onClick={() => setPm(v)} aria-pressed={pm === v} className={`h-9 w-14 rounded-lg text-sm font-bold transition-colors ${pm === v ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Clock face */}
        <div className="relative mx-auto mt-5 h-64 w-64 rounded-full bg-neutral-100 dark:bg-neutral-800/70">
          {/* Hand from the centre to the chosen number */}
          <div className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600" />
          <div className="absolute top-1/2 left-1/2 w-0.5 origin-bottom bg-emerald-600 transition-transform duration-200" style={{ height: R, transform: `translate(-50%, -100%) rotate(${angle}deg)` }} />
          {values.map((v, i) => {
            const a = (i / 12) * 2 * Math.PI;
            const x = 128 + R * Math.sin(a);
            const y = 128 - R * Math.cos(a);
            const on = v === selected;
            return (
              <button
                key={v}
                type="button"
                onClick={() => pick(v)}
                aria-label={mode === "hour" ? `${v} o'clock` : `${v} minutes`}
                className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors ${on ? "bg-emerald-600 text-white shadow-md" : "text-neutral-700 hover:bg-white dark:text-neutral-200 dark:hover:bg-neutral-700"}`}
                style={{ left: x, top: y }}
              >
                {mode === "hour" ? v : pad(v)}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-neutral-500">{mode === "hour" ? "Tap the hour" : "Now tap the minutes"}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-neutral-200 text-sm font-semibold dark:border-neutral-700">
            Cancel
          </button>
          <button type="button" onClick={save} className="h-11 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
