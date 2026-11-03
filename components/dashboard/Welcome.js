"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/common/Logo";
import { EXERCISES } from "@/lib/data/exercises";
import { FOODS } from "@/lib/data/foods";
import { formatDuration } from "@/lib/utils";

const ACTIONS = [
  {
    href: "/plans/workout/new",
    title: "Build a workout plan",
    text: "Search the exercise library and set sets, reps, holds and rest for each training day.",
    icon: "M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11",
  },
  {
    href: "/plans/diet/new",
    title: "Build a diet plan",
    text: "Pick from common foods and macros fill in automatically. See daily protein at a glance.",
    icon: "M12 21c-4.4 0-8-3.1-8-7.5C4 8 8 4 12 3c4 1 8 5 8 10.5 0 4.4-3.6 7.5-8 7.5zM12 3v18M12 12l4-3M12 16l-4-3",
  },
  {
    href: "/plans/import",
    title: "Import a plan",
    text: "Upload a workout or diet PDF and review what we read, or restore a FitMate backup.",
    icon: "M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4",
  },
];

const STATS = [
  { value: EXERCISES.length, suffix: "+", label: "Exercises" },
  { value: FOODS.length, suffix: "+", label: "Foods with macros" },
];

export default function Welcome() {
  return (
    <div className="relative isolate">
      <Backdrop />

      <section className="relative grid items-center gap-12 pt-4 pb-10 lg:grid-cols-[1.1fr_1fr] lg:pt-10">
        <div className="text-center lg:text-left">

          <h1 className="animate-fade-up mt-5 text-4xl font-semibold tracking-tight [animation-delay:100ms] sm:text-5xl lg:text-6xl">
            Train with intent.
            <br />
            <span className="text-gradient animate-shimmer">Track what matters.</span>
          </h1>

          <p className="animate-fade-up mx-auto mt-5 max-w-lg text-base text-neutral-600 [animation-delay:200ms] sm:text-lg lg:mx-0 dark:text-neutral-400">
            Your workouts, rest timer, meals and protein in one calm place. Plan once, follow daily, and watch progress compound.
          </p>

          <div className="animate-fade-up mt-8 flex flex-col justify-center gap-3 [animation-delay:300ms] sm:flex-row lg:justify-start">
            <Link
              href="/plans/workout/new"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/25 transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              Get started
              <Arrow />
            </Link>
            <Link
              href="/plans/diet/new"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-6 py-3.5 font-semibold transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Set up nutrition
            </Link>
          </div>

          <dl className="animate-fade-up mt-10 grid grid-cols-2 gap-6 [animation-delay:400ms] sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="text-xs text-neutral-500">{s.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  <CountUp to={s.value} prefix={s.prefix} suffix={s.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <AppPreview />
      </section>

      <section className="relative grid gap-4 pb-6 md:grid-cols-3">
        {ACTIONS.map((a, i) => (
          <SpotlightCard key={a.href} {...a} delay={500 + i * 120} />
        ))}
      </section>
    </div>
  );
}

export function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-x-[-1rem] -top-10 bottom-0 -z-10 overflow-hidden md:inset-x-[-2rem]" aria-hidden="true">
      <div className="bg-grid absolute inset-0" />
      <div className="animate-drift absolute top-[-10%] left-[10%] h-96 w-96 rounded-full bg-emerald-400/25 blur-3xl dark:bg-emerald-500/15" />
      <div className="animate-drift absolute top-[20%] right-[0%] h-80 w-80 rounded-full bg-sky-400/20 blur-3xl [animation-delay:-6s] dark:bg-sky-500/10" />
      <div className="animate-drift absolute bottom-[0%] left-[40%] h-72 w-72 rounded-full bg-teal-300/20 blur-3xl [animation-delay:-12s] dark:bg-teal-500/10" />
    </div>
  );
}

// Live, looping mock of the app: rest timer, set log, protein ring and weekly volume.
export function AppPreview() {
  const tiltRef = useRef(null);
  const ringRef = useRef(null);
  const [remaining, setRemaining] = useState(90);
  const [protein, setProtein] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setProtein(82), 600);
    if (reduce) return () => clearTimeout(t);

    // Real-time countdown from the timestamp (same approach the real rest timer will use).
    // Runs once at normal speed and stops at zero instead of looping.
    const REST_MS = 90_000;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / REST_MS);
      setRemaining(Math.ceil((REST_MS / 1000) * (1 - p)));
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(p >= 1 ? 0 : p);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(frame);
    };
  }, []);

  function onPointerMove(e) {
    const el = tiltRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1200px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
  }

  function onPointerLeave() {
    if (tiltRef.current) tiltRef.current.style.transform = "";
  }

  return (
    <div className="animate-scale-in relative mx-auto w-full max-w-md [animation-delay:250ms]" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="absolute inset-6 -z-10 rounded-[2.5rem] bg-emerald-500/30 blur-3xl" />
      <div ref={tiltRef} className="transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d]">
        <div className="animate-float rounded-[2rem] border border-neutral-200 bg-white/80 p-4 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="mb-4 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <LogoMark className="h-6 w-6" />
              <span className="text-sm font-semibold">Push Day</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Live session</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex items-center gap-4 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-950">
              <div className="relative h-28 w-28 shrink-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-neutral-200 dark:stroke-neutral-800" />
                  <circle
                    ref={ringRef}
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    pathLength="1"
                    strokeDasharray="1"
                    className="stroke-emerald-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {remaining === 0 ? (
                    <span className="animate-fade-up text-2xl font-semibold text-emerald-500">Go</span>
                  ) : (
                    <span className="text-2xl font-semibold tabular-nums">{formatDuration(remaining)}</span>
                  )}
                  <span className="text-[10px] tracking-wider text-neutral-500 uppercase">{remaining === 0 ? "Set 4" : "Rest"}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {[
                  ["Set 1", "8 reps"],
                  ["Set 2", "8 reps"],
                  ["Set 3", "7 reps"],
                ].map(([set, reps], i) => (
                  <div key={set} className="animate-check flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-sm dark:bg-neutral-900" style={{ animationDelay: `${900 + i * 250}ms` }}>
                    <span className="text-neutral-500">{set}</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      {reps}
                      <Check />
                    </span>
                  </div>
                ))}
                <p className="truncate text-xs text-neutral-500">Next: Weighted Dip · 3 × 6</p>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-950">
              <p className="text-xs text-neutral-500">Protein</p>
              <div className="relative mt-2 h-20 w-20">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" strokeWidth="12" className="stroke-neutral-200 dark:stroke-neutral-800" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    strokeWidth="12"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray="100"
                    strokeDashoffset={100 - protein}
                    className="stroke-sky-500 transition-[stroke-dashoffset] duration-[1600ms] ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">{protein}%</span>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                <b className="text-neutral-900 dark:text-neutral-100">115</b> / 140 g
              </p>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-950">
              <p className="text-xs text-neutral-500">Weekly volume</p>
              <div className="mt-3 flex h-20 items-end gap-1.5">
                {[40, 65, 30, 80, 55, 95, 70].map((h, i) => (
                  <div
                    key={i}
                    className={`animate-bar flex-1 origin-bottom rounded-t-md ${i === 5 ? "bg-emerald-500" : "bg-emerald-500/30"}`}
                    style={{ height: `${h}%`, animationDelay: `${700 + i * 90}ms` }}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">+12% vs last week</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpotlightCard({ href, title, text, icon, delay }) {
  const ref = useRef(null);

  function onPointerMove(e) {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--x", `${e.clientX - r.left}px`);
    ref.current.style.setProperty("--y", `${e.clientY - r.top}px`);
  }

  return (
    <Link
      ref={ref}
      href={href}
      onPointerMove={onPointerMove}
      className="group animate-fade-up relative overflow-hidden rounded-2xl bg-neutral-200 p-px transition-transform duration-300 hover:-translate-y-1 dark:bg-neutral-800"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="spotlight absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex h-full flex-col rounded-[15px] bg-white p-6 dark:bg-neutral-900">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </span>
        <h3 className="mt-5 font-semibold">{title}</h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-neutral-500">{text}</p>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Continue
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            <Arrow />
          </span>
        </span>
      </div>
    </Link>
  );
}

export function CountUp({ to, prefix = "", suffix = "", duration = 1400 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setValue(to);
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);

  return (
    <>
      {prefix}
      {value}
      {suffix}
    </>
  );
}

export function Arrow() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

export function Check() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}
