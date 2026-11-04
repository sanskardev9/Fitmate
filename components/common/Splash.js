"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoMark } from "./Logo";

// The problems first ("Health?" holds longest), then FitMate as the answer.
const PROBLEMS = ["Health?", "Diet?", "Workouts?", "Protein?", "Rest timers?", "Macros?", "Progress?", "Consistency?"];
const FIRST_MS = 900;
const WORD_MS = 160;
const ANSWER_MS = 2400; // long enough to read "FitMate" and its tagline
const LEAVE_MS = 900;

// When each word appears, and when the screen lifts and is gone (ms after the intro started).
const SCHEDULE = (() => {
  const words = [0];
  let at = FIRST_MS;
  for (let i = 1; i < PROBLEMS.length; i += 1) {
    words.push(at);
    at += WORD_MS;
  }
  words.push(at); // the answer
  return { words, leave: at + ANSWER_MS, done: at + ANSWER_MS + LEAVE_MS };
})();

// When the intro started in this page load. A module variable, so it survives React re-running
// effects (Strict Mode, fast refresh) without restarting, and resets on every full reload.
let startedAt = null;
const finished = () => startedAt !== null && performance.now() - startedAt >= SCHEDULE.done;

// Auth and setup pages are task pages (often opened from an email link): no intro there.
const NO_INTRO = /^\/(login|auth\/|reset-password|onboarding)/;

// Plays on every load or refresh; skipped on back/forward and for people who prefer reduced motion.
function shouldPlay() {
  if (NO_INTRO.test(window.location.pathname)) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return performance.getEntriesByType?.("navigation")?.[0]?.type !== "back_forward";
}

export default function Splash() {
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(() => (typeof window !== "undefined" && finished() ? "done" : "words"));

  useEffect(() => {
    if (finished()) {
      setPhase("done");
      return undefined;
    }
    if (startedAt === null) {
      if (!shouldPlay()) {
        startedAt = performance.now() - SCHEDULE.done; // counts as already shown for this load
        setPhase("done");
        return undefined;
      }
      startedAt = performance.now();
    }
    // Resume from wherever the schedule is, so a re-run effect doesn't restart the intro.
    const elapsed = performance.now() - startedAt;
    const later = (at, fn) => setTimeout(fn, Math.max(at - elapsed, 0));

    document.documentElement.style.overflow = "hidden";
    const timers = SCHEDULE.words.map((at, i) => later(at, () => setIndex(i)));
    timers.push(later(SCHEDULE.leave, () => setPhase("leaving")));
    timers.push(
      later(SCHEDULE.done, () => {
        setPhase("done");
        document.documentElement.style.overflow = "";
      }),
    );
    return () => {
      timers.forEach(clearTimeout);
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (phase === "done" || NO_INTRO.test(pathname)) return null;
  const answer = index >= PROBLEMS.length;
  const leaving = phase === "leaving";

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)] px-6 transition-transform duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        leaving ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Curved bottom edge: bulges down while the screen lifts away. */}
      <span
        className={`absolute top-full left-[-10%] h-40 w-[120%] -translate-y-1/2 rounded-[50%] bg-[var(--background)] transition-transform duration-[900ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
          leaving ? "scale-y-100" : "scale-y-0"
        }`}
      />
      <div className={`pointer-events-none absolute h-80 w-80 rounded-full blur-3xl transition-colors duration-500 ${answer ? "bg-emerald-500/25" : "bg-emerald-500/5"}`} />

      <div className={`relative transition-opacity duration-300 ${leaving ? "opacity-0" : "opacity-100"}`}>
        {answer ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <LogoMark className="h-16 w-16 sm:h-20 sm:w-20" animated />
            <p className="animate-fade-up text-3xl font-semibold text-neutral-900 [animation-delay:300ms] dark:text-white sm:text-5xl">
              Fit<span className="text-emerald-600 dark:text-emerald-400">Mate</span>
            </p>
            <p className="animate-fade-up text-sm text-neutral-500 [animation-delay:450ms] dark:text-neutral-400 sm:text-base">Your Fitness. Your Nutrition. Your Progress.</p>
          </div>
        ) : (
          <p className={`flex items-center gap-3 font-semibold text-neutral-900 dark:text-white ${index === 0 ? "text-5xl sm:text-7xl" : "text-4xl sm:text-6xl"}`}>
            <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(52,211,153,0.9)] dark:bg-emerald-400 sm:h-4 sm:w-4" />
            {PROBLEMS[index]}
          </p>
        )}
      </div>
    </div>
  );
}
