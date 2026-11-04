"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

// Light / Dark. Until the user picks one, FitMate follows the device setting (live); after that the
// choice is remembered on this device. Switching wipes the new theme across the screen (View Transitions).
const KEY = "fitmate:theme";

const isDarkNow = () => document.documentElement.classList.contains("dark");

function setDark(dark) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export default function ThemeToggle({ className = "" }) {
  const [dark, setDarkState] = useState(false);
  useEffect(() => {
    const sync = () => setDarkState(isDarkNow());
    sync();
    window.addEventListener("fitmate:theme", sync);
    return () => window.removeEventListener("fitmate:theme", sync);
  }, []);

  function toggle() {
    const next = !isDarkNow();
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {}
    setDarkState(next);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) return setDark(next);
    document.documentElement.dataset.themeWipe = next ? "to-dark" : "to-light";
    const t = document.startViewTransition(() => setDark(next));
    t.finished.finally(() => delete document.documentElement.dataset.themeWipe);
  }

  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white ${className}`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
