"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Snowflake, Share2 } from "lucide-react";
import { Flame } from "./HomeToday";

// The "you did it" moment, Duolingo-style: the flame pops, the number flips from yesterday's to
// today's with confetti and a chime, today's circle in the week fills in, then the milestone line.
const COLORS = ["#f97316", "#facc15", "#10b981", "#38bdf8", "#f472b6", "#a78bfa"];
const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function message(count, best, freezeEarned) {
  if (freezeEarned) return ["A full week!", "You earned a streak freeze. It saves your streak if you miss a day."];
  if (count === 1) return ["Day one.", "Every streak starts here. Come back tomorrow for day 2."];
  if (count === 2) return ["Two in a row!", "That's how habits start. Make it three tomorrow."];
  if (count > 2 && count === best) return ["New personal best!", `${count} days is your longest streak ever. Keep going.`];
  if (MILESTONES.includes(count)) return [`${count} days!`, "A real milestone. Most people never get here."];
  return [`${count} days strong.`, "Don't break the chain. See you tomorrow."];
}

// Rising "ta-da": four quick notes, then a bright last one.
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime + 0.05;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      const at = t + i * 0.09;
      const len = i === 4 ? 0.6 : 0.16;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + len + 0.05);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

export default function StreakCelebration({ count, best = count, week = [], freezes = 0, onClose }) {
  const [step, setStep] = useState(0); // 0 flame, 1 number flips, 2 week fills, 3 text + buttons
  const [shared, setShared] = useState(false);
  const freezeEarned = count > 0 && count % 7 === 0 && freezes > 0;
  const [title, line] = message(count, best, freezeEarned);
  const next = MILESTONES.find((m) => m > count) ?? count + 100;
  const prev = [...MILESTONES].reverse().find((m) => m <= count) ?? 0;
  const progress = Math.round(((count - prev) / (next - prev)) * 100);

  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        drift: (Math.random() - 0.5) * 300,
        spin: 360 + Math.random() * 900,
        size: 6 + Math.random() * 8,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.6,
      })),
    [],
  );

  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setStep(1);
        chime();
        navigator.vibrate?.([40, 60, 40, 60, 120]);
      }, 550),
      setTimeout(() => setStep(2), 1250),
      setTimeout(() => setStep(3), 1800),
    ];
    const onKey = (e) => (e.key === "Escape" || e.key === "Enter") && onClose();
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [onClose]);

  async function share() {
    const text = `${count}-day streak on FitMate! Following my workout and diet plan every day.`;
    try {
      if (navigator.share) await navigator.share({ text, url: window.location.origin });
      else {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
        setShared(true);
      }
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center overflow-y-auto bg-[var(--background)] px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      {/* Confetti, once the number flips */}
      {step >= 1 && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {pieces.map((p, i) => (
            <span
              key={i}
              className="animate-confetti absolute top-0"
              style={{ left: `${p.left}%`, width: p.size, height: p.round ? p.size : p.size * 1.8, background: p.color, borderRadius: p.round ? "999px" : "2px", animationDelay: `${p.delay}s`, "--drift": `${p.drift}px`, "--spin": `${p.spin}deg` }}
            />
          ))}
        </div>
      )}

      <div className="relative flex w-full max-w-sm flex-1 flex-col items-center justify-center text-center">
        {/* Flame on a slowly turning sunburst */}
        <div className="relative flex h-52 w-52 items-center justify-center">
          <div
            className="motion-safe:animate-spin-slow absolute inset-0 rounded-full opacity-70"
            style={{ background: "repeating-conic-gradient(from 0deg, rgba(251,146,60,0.22) 0deg 10deg, transparent 10deg 30deg)", maskImage: "radial-gradient(circle, #000 35%, transparent 70%)", WebkitMaskImage: "radial-gradient(circle, #000 35%, transparent 70%)" }}
          />
          <div className="absolute h-36 w-36 rounded-full bg-orange-400/25 blur-2xl" />
          <div className="animate-pop relative">
            <Flame lit className="h-36 w-36 drop-shadow-[0_14px_30px_rgba(249,115,22,0.55)]" />
          </div>
        </div>

        {/* The number flips from yesterday's to today's */}
        <div className="relative -mt-2 h-24 w-full overflow-hidden">
          <span className={`absolute inset-x-0 text-8xl leading-none font-extrabold text-orange-500 tabular-nums transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${step >= 1 ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>{Math.max(0, count - 1)}</span>
          <span className={`absolute inset-x-0 text-8xl leading-none font-extrabold text-orange-500 tabular-nums transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${step >= 1 ? "translate-y-0 scale-100 opacity-100" : "translate-y-full scale-75 opacity-0"}`}>{count}</span>
        </div>
        <p className="text-2xl font-extrabold text-orange-500">day streak!</p>

        {/* This week: today's circle fills in */}
        {week.length === 7 && (
          <div className={`mt-7 w-full rounded-2xl border border-neutral-200 bg-white p-4 transition-all duration-500 dark:border-neutral-800 dark:bg-neutral-900 ${step >= 1 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
            <div className="grid grid-cols-7 gap-1">
              {week.map((d, i) => {
                const done = d.status === "done" && (!d.isToday || step >= 2);
                const frozen = d.status === "frozen";
                return (
                  <span key={d.key} className="flex flex-col items-center gap-1.5">
                    <span className={`text-xs font-bold ${d.isToday ? "text-orange-500" : "text-neutral-400"}`}>{DAY_LETTERS[i]}</span>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                        done ? "bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/30" : frozen ? "bg-sky-500 text-white" : d.isToday ? "border-2 border-dashed border-orange-300" : "bg-neutral-100 dark:bg-neutral-800"
                      } ${d.isToday && done ? "animate-pop" : ""}`}
                    >
                      {done ? <Check className="h-5 w-5" strokeWidth={3} /> : frozen ? <Snowflake className="h-4 w-4" /> : null}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Milestone line, freeze earned, next goal */}
        <div className={`mt-6 w-full transition-all duration-500 ${step >= 3 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
          <p className="text-xl font-bold">{title}</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">{line}</p>
          {freezeEarned && (
            <p className="animate-pop mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-4 py-2 text-sm font-bold text-sky-700 dark:text-sky-300">
              <Snowflake className="h-4 w-4" /> +1 streak freeze
            </p>
          )}
          <div className="mt-5 text-left">
            <div className="flex justify-between text-xs font-semibold text-neutral-500">
              <span>Next: {next}-day streak</span>
              <span>{next - count === 1 ? "1 more day" : `${next - count} more days`}</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] delay-300 duration-1000 ease-out" style={{ width: step >= 3 ? `${Math.max(6, progress)}%` : "0%" }} />
            </div>
          </div>
        </div>
      </div>

      <div className={`relative mt-6 w-full max-w-sm space-y-3 transition-all duration-500 ${step >= 3 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}>
        <button type="button" onClick={onClose} autoFocus className="w-full rounded-2xl bg-orange-500 py-4 text-lg font-extrabold tracking-wide text-white uppercase shadow-[0_5px_0_#c2410c] transition-transform active:translate-y-1 active:shadow-[0_1px_0_#c2410c]">
          Continue
        </button>
        <button type="button" onClick={share} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-neutral-200 py-3 font-bold text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          <Share2 className="h-4 w-4" /> {shared ? "Copied, paste it anywhere" : "Share my streak"}
        </button>
      </div>
    </div>
  );
}
