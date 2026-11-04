"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, SunMoon, Check } from "lucide-react";

// Theme. Website: one-tap Light/Dark toggle. Inside the app (withSystem): a small menu with
// Light, Dark and System default (follows the device, live). Until someone picks, FitMate follows
// the device. Switching wipes the new theme across the screen (View Transitions).
const KEY = "fitmate:theme";

const isDarkNow = () => document.documentElement.classList.contains("dark");
const readChoice = () => {
  try {
    return localStorage.getItem(KEY) || "system";
  } catch {
    return "system";
  }
};
const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function setDark(dark) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

// Save the choice and show it (with the wipe when light/dark actually changes).
function applyTheme(choice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {}
  const next = choice === "dark" || (choice === "system" && systemDark());
  if (next !== isDarkNow()) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) setDark(next);
    else {
      document.documentElement.dataset.themeWipe = next ? "to-dark" : "to-light";
      const t = document.startViewTransition(() => setDark(next));
      t.finished.finally(() => delete document.documentElement.dataset.themeWipe);
    }
  }
  window.dispatchEvent(new Event("fitmate:theme"));
}

const OPTIONS = [
  ["light", "Light", Sun],
  ["dark", "Dark", Moon],
  ["system", "System default", SunMoon],
];

const buttonClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white";

export default function ThemeToggle({ className = "", withSystem = false, placement = "down" }) {
  const [dark, setDarkState] = useState(false);
  const [choice, setChoice] = useState("system");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const sync = () => {
      setDarkState(isDarkNow());
      setChoice(readChoice());
    };
    sync();
    window.addEventListener("fitmate:theme", sync);
    return () => window.removeEventListener("fitmate:theme", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const away = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  // Website: simple toggle.
  if (!withSystem) {
    const Icon = dark ? Sun : Moon;
    return (
      <button type="button" onClick={() => applyTheme(isDarkNow() ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"} className={`${buttonClass} ${className}`}>
        <Icon className="h-[18px] w-[18px]" />
      </button>
    );
  }

  // App: Light / Dark / System default.
  const Current = choice === "system" ? SunMoon : choice === "dark" ? Moon : Sun;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label="Theme" title="Theme" className={`${buttonClass} ${className}`}>
        <Current className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div role="menu" className={`animate-fade-up absolute right-0 z-[60] w-48 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl [animation-duration:150ms] dark:border-neutral-800 dark:bg-neutral-900 ${placement === "up" ? "bottom-full mb-2" : "top-full mt-2"}`}>
          {OPTIONS.map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={choice === value}
              onClick={() => {
                applyTheme(value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${choice === value ? "bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300" : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {choice === value && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
