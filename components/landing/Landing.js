"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogoMark } from "@/components/common/Logo";
import { Backdrop, Arrow } from "@/components/dashboard/Welcome";
import Reveal, { useInView } from "./Reveal";

// Positioning: bring your plan or get one built for your level in minutes. Then FitMate makes sure you follow it.

const SOURCES = [
  "A plan built for your level in FitMate",
  "A plan an AI wrote for you",
  "Your coach's PDF",
  "Your gym trainer's sheet",
  "Your dietitian's meal chart",
  "A YouTube program",
  "Notes on your phone",
  "A plan you wrote yourself",
  "An Instagram routine",
];

const GAP = [
  ["Day 1", "Every set done. Every meal on time.", 100],
  ["Day 4", "Rested “about two minutes”. It was five.", 80],
  ["Day 9", "Which exercise was next? Opened the PDF, gave up.", 55],
  ["Day 14", "Protein? Probably fine. Not sure.", 30],
  ["Day 21", "The plan is still in a PDF you never open.", 10],
];

const ISNT = ["A one-size-fits-all program", "A plan that ignores your level", "A diet full of meals you'll never cook", "Another 40-page PDF you never open"];
const IS = ["A plan made for your level, or the one you already have", "Today's workout and meals on one screen", "One big button to log every set, rest timer included", "Easy meals with recipes and how-to videos", "A streak and progress you can actually see"];

const STEPS = [
  ["Get your plan", "Already have one? Drop in the PDF or paste it from any AI chat. Don't? Tap a few answers (level, skills, equipment, food) and FitMate builds a prompt that gets you a plan made for you."],
  ["Open. Tap. Done.", "Today's workout and meals sit on one screen. One big button logs your next set, the rest timer starts on its own, and warm-ups stay separate from the real work."],
  ["Watch it stick", "Your streak grows every day you follow the plan. Progress charts, personal bests and past workouts show it's working."],
];

const FAQ = [
  ["Can FitMate make a plan for me?", "Yes. Tap a few answers (your level, the skills you're chasing, max reps, equipment, food style) and FitMate writes a prompt with your profile built in. Paste it into ChatGPT, Claude or Gemini, paste the reply back, and your plan is ready to follow."],
  ["I already have a plan. Will it work?", "Yes. Upload your coach's PDF or JSON, or paste a plan from any AI chat. FitMate reads days, exercises, sets, reps, holds, rest, meals and macros, and highlights anything it isn't sure about before you save."],
  ["Will the diet be hard to cook?", "No. Plans favour simple home food with a few common ingredients, short step-by-step recipes and a how-to video for each meal. Training days and rest days are fuelled differently."],
  ["Does it work at the gym without internet?", "Yes. Your plan and logs live on your phone, so it works offline, and it syncs to your account when you're back online."],
  ["What if my plan changes?", "Edit it, reorder exercises with a drag, or import a new one. Past workouts stay exactly as you did them."],
  ["Does it cost anything?", "No."],
];

export default function Landing() {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  return (
    <div className="relative overflow-x-clip">
      <ScrollProgress />
      <Nav signedIn={signedIn} />
      <Hero signedIn={signedIn} />
      <Sources />
      <Gap />
      <IsIsnt />
      <HowItWorks />
      <Features />
      <Faq />
      <FinalCta signedIn={signedIn} />
      <footer className="border-t border-neutral-200 px-6 py-10 text-center text-sm text-neutral-500 dark:border-neutral-800">
        <div className="mb-3 flex items-center justify-center gap-2">
          <LogoMark className="h-6 w-6" />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">FitMate</span>
        </div>
        Get a plan that fits. Then actually follow it.
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------- chrome

function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    let frame;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (ref.current) ref.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div ref={ref} className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left scale-x-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />;
}

function Nav({ signedIn }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-neutral-200/70 bg-[var(--background)]/75 backdrop-blur-xl dark:border-neutral-800/70" : ""}`}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">
            Fit<span className="text-emerald-600 dark:text-emerald-400">Mate</span>
          </span>
        </a>
        <div className="hidden items-center gap-8 text-sm text-neutral-600 md:flex dark:text-neutral-400">
          {[
            ["#gap", "Why FitMate"],
            ["#how", "How it works"],
            ["#faq", "FAQ"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="transition-colors hover:text-neutral-900 dark:hover:text-white">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/home" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5">
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900">
                Log in
              </Link>
              <Link href="/login?mode=signup" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function PrimaryCta({ signedIn, children, className = "" }) {
  return (
    <Link
      href={signedIn ? "/home" : "/login?mode=signup"}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-600 px-7 py-4 font-semibold text-white shadow-lg shadow-emerald-600/25 transition-transform hover:-translate-y-0.5 ${className}`}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      {signedIn ? "Open FitMate" : children}
      <Arrow />
    </Link>
  );
}

// ---------------------------------------------------------------- hero

function Hero({ signedIn }) {
  return (
    <section id="top" className="relative isolate px-5 pt-32 pb-24 sm:pt-40">
      <Backdrop />
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
        <div className="min-w-0 text-center lg:text-left">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white/60 px-3 py-1 text-xs font-medium text-neutral-600 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Plans that fit you. Follow-through that sticks.
          </p>
          <h1 className="animate-fade-up mt-6 text-[2.5rem] leading-[1.05] font-semibold tracking-tight [animation-delay:100ms] sm:text-6xl lg:text-[4.25rem]">
            Getting a plan takes seconds.
            <br />
            <span className="text-gradient animate-shimmer">Following it is what changes you.</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-600 [animation-delay:200ms] lg:mx-0 dark:text-neutral-400">
            Bring your plan, or get one built for your level in minutes. Then FitMate puts today&apos;s workout and meals on one screen, logs every set with one tap, times your rests and keeps your streak alive.
          </p>
          <div className="animate-fade-up mt-9 flex flex-col justify-center gap-3 [animation-delay:300ms] sm:flex-row lg:justify-start">
            <PrimaryCta signedIn={signedIn}>Get started free</PrimaryCta>
            <a href="#gap" className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-7 py-4 font-semibold transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900">
              Why plans fail
            </a>
          </div>
        </div>
        <PlanToToday />
      </div>
    </section>
  );
}

const TODAY = [
  ["Pull-up", "4 × 8", "workout"],
  ["Weighted Dip", "3 × 8 · 10 kg", "workout"],
  ["Planche Lean", "4 × 20s", "workout"],
  ["Breakfast · Oats + whey", "38 g protein", "meal"],
  ["Lunch · Chicken & rice", "50 g protein", "meal"],
];

const PROMPT = "Write me a 4-day push/pull plan with meals";

// Looping demo: an AI writes a plan in seconds (the easy part), then FitMate turns it into
// today's checklist and items get done (the part that matters).
function PlanToToday() {
  const [t, setT] = useState(0);
  const tiltRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setT(40);
    const id = setInterval(() => setT((n) => (n + 1) % 46), 280);
    return () => clearInterval(id);
  }, []);

  // Timeline (ticks of 280 ms): 0–9 prompt types, 10 plan ready, 11–15 scan, 16–20 items appear,
  // 22–37 items checked, hold, loop.
  const typed = PROMPT.slice(0, Math.round((Math.min(t, 9) / 9) * PROMPT.length));
  const planReady = t >= 10;
  const scanning = t >= 11 && t < 16;
  const shown = Math.max(0, Math.min(TODAY.length, t - 15));
  const done = Math.max(0, Math.min(TODAY.length, Math.floor((t - 19) / 3)));
  const pct = Math.round((done / TODAY.length) * 100);

  function onPointerMove(e) {
    const el = tiltRef.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1200px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  }

  return (
    <div className="animate-scale-in relative mx-auto w-full max-w-md min-w-0 [animation-delay:250ms]" onPointerMove={onPointerMove} onPointerLeave={() => tiltRef.current && (tiltRef.current.style.transform = "")}>
      <div className="absolute inset-8 -z-10 rounded-[2.5rem] bg-emerald-500/25 blur-3xl" />
      <div ref={tiltRef} className="relative pt-24 transition-transform duration-300 ease-out [transform-style:preserve-3d]">
        {/* 1. The easy part: an AI writes the plan in seconds */}
        <div className="absolute top-0 left-0 w-[19rem] max-w-[92%] rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z" />
            </svg>
            Any AI chat app
          </div>
          <p className="mt-1 min-h-[2.5rem] text-sm">
            {typed}
            {!planReady && <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-neutral-400" />}
          </p>
          <p className={`mt-1 text-xs font-medium text-emerald-600 transition-opacity duration-300 dark:text-emerald-400 ${planReady ? "opacity-100" : "opacity-0"}`}>✓ Plan ready in 8 seconds. Now you have to follow it.</p>
        </div>

        {/* The plan itself */}
        <div
          className={`absolute top-28 -left-2 w-40 -rotate-6 rounded-xl border border-neutral-300 bg-white p-3 shadow-xl transition-all duration-500 sm:-left-10 dark:border-neutral-700 dark:bg-neutral-900 ${
            planReady ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div className="mb-2 flex items-center gap-1.5">
            <span className="rounded bg-red-500/90 px-1 text-[9px] font-bold text-white">PDF</span>
            <span className="truncate text-[11px] font-medium">push-pull-plan.pdf</span>
          </div>
          <div className="relative space-y-1.5 overflow-hidden [--scan-h:76px]">
            {[92, 70, 84, 62, 78, 55, 88, 66].map((w, i) => (
              <div key={i} className="h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" style={{ width: `${w}%` }} />
            ))}
            {scanning && <div className="animate-scan absolute inset-x-0 top-0 h-0.5 bg-emerald-500 shadow-[0_0_12px_3px_rgba(16,185,129,0.6)]" />}
          </div>
        </div>

        {/* 2. The part that matters: FitMate turns it into today, and it gets done */}
        <div className="animate-float relative mt-14 ml-10 rounded-[1.75rem] border border-neutral-200 bg-white/90 p-5 shadow-2xl backdrop-blur-xl sm:ml-20 dark:border-neutral-800 dark:bg-neutral-900/90">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">FitMate · Today</p>
              <p className="text-lg font-semibold">Push Day</p>
            </div>
            <div className="relative h-14 w-14">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" strokeWidth="12" className="stroke-neutral-200 dark:stroke-neutral-800" />
                <circle cx="60" cy="60" r="50" fill="none" strokeWidth="12" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - pct} className="stroke-emerald-500 transition-[stroke-dashoffset] duration-500" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
                {done}/{TODAY.length}
              </span>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {TODAY.map(([name, detail, kind], i) => {
              const visible = i < shown;
              const checked = i < done;
              return (
                <li
                  key={name}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-500 ${visible ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"} ${
                    checked ? "bg-emerald-500/10" : "bg-neutral-50 dark:bg-neutral-950"
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors duration-300 ${checked ? "bg-emerald-500 text-white" : "border-2 border-neutral-300 dark:border-neutral-700"}`}>
                    {checked && (
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 10.5l4 4 8-9" />
                      </svg>
                    )}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-sm ${checked ? "text-neutral-500 line-through decoration-neutral-400" : "font-medium"}`}>{name}</span>
                  <span className={`shrink-0 text-xs ${kind === "meal" ? "text-sky-600 dark:text-sky-400" : "text-neutral-500"}`}>{detail}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- sources

function Sources() {
  return (
    <section className="border-y border-neutral-200 py-8 dark:border-neutral-800">
      <p className="mb-5 text-center text-xs font-medium tracking-wider text-neutral-500 uppercase">Works with any plan, from anywhere</p>
      <div className="mask-fade-x flex overflow-hidden">
        <div className="animate-marquee flex shrink-0 gap-3 pr-3">
          {[...SOURCES, ...SOURCES].map((s, i) => (
            <span key={i} className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm whitespace-nowrap text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6" />
              </svg>
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- the gap

function Gap() {
  const ref = useRef(null);
  const visible = useInView(ref, { threshold: 0.08 });
  return (
    <section id="gap" className="scroll-mt-20 px-5 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">The real problem</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Getting a plan is easy now.
            <br />
            <span className="text-neutral-400 dark:text-neutral-500">Following it never got easier.</span>
          </h2>
          <p className="mt-5 text-lg text-neutral-600 dark:text-neutral-400">An AI can write a 12-week program before your coffee cools. It can&apos;t make you do day 23.</p>
        </Reveal>

        <EffortCompare />

        <Reveal className="mt-20 text-center">
          <p className="text-lg font-medium">And that&apos;s exactly where plans fall apart.</p>
          <p className="mt-1 text-neutral-500">Not on day one. One small slip at a time.</p>
        </Reveal>

        <div ref={ref} className={`mt-10 grid gap-3 md:grid-cols-5 ${visible ? "is-visible" : ""}`}>
          {GAP.map(([day, text, followed], i) => {
            const hue = followed >= 80 ? "bg-emerald-500" : followed >= 50 ? "bg-amber-500" : "bg-rose-500";
            return (
              <div
                key={day}
                className="reveal-child flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                style={{ "--reveal-delay": `${i * 140}ms`, opacity: visible ? 0.35 + followed / 154 : undefined }}
              >
                <span className="text-sm font-semibold">{day}</span>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{text}</p>
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-[11px] text-neutral-500">
                    <span>Plan followed</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div className={`h-full rounded-full ${hue} transition-[width] duration-1000 ease-out`} style={{ width: visible ? `${followed}%` : "100%", transitionDelay: `${600 + i * 160}ms` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Reveal delay={200} className="mt-14 text-center">
          <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
            The plan was fine. <span className="text-emerald-600 dark:text-emerald-400">The follow-through wasn&apos;t.</span>
          </p>
          <p className="mx-auto mt-3 max-w-xl text-neutral-600 dark:text-neutral-400">That&apos;s what FitMate is built to fix.</p>
        </Reveal>
      </div>
    </section>
  );
}

// Getting the plan (one sliver) vs. following it (84 days that fill one by one).
function EffortCompare() {
  const ref = useRef(null);
  const visible = useInView(ref, { threshold: 0.25 });
  const DAYS = 84;
  return (
    <div ref={ref} className="mx-auto mt-16 max-w-4xl space-y-8 rounded-3xl border border-neutral-200 bg-white p-6 sm:p-10 dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-medium">Getting the plan</p>
          <p className="text-sm text-violet-600 dark:text-violet-400">≈ 10 seconds with AI</p>
        </div>
        <div className="mt-3 flex h-4 items-center">
          <div className={`h-3 rounded-full bg-violet-500 transition-[width] duration-500 ease-out ${visible ? "w-3" : "w-0"}`} />
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-medium">Following it</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">84 days · every set · every meal</p>
        </div>
        <div className="mt-3 grid grid-cols-[repeat(21,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(42,minmax(0,1fr))]">
          {Array.from({ length: DAYS }, (_, i) => (
            <span
              key={i}
              className={`aspect-square rounded-[3px] transition-colors duration-300 ${visible ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-800"}`}
              style={{ transitionDelay: visible ? `${400 + i * 28}ms` : "0ms" }}
            />
          ))}
        </div>
      </div>
      <p className="border-t border-neutral-200 pt-6 text-center text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        Your results come from the second bar. <span className="font-semibold text-neutral-900 dark:text-neutral-100">FitMate is built entirely for it.</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- is / isn't

function IsIsnt() {
  return (
    <section className="bg-neutral-100/60 px-5 py-28 dark:bg-neutral-900/40">
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Not just another plan. A follow-through app.</h2>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          <Reveal className="rounded-3xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-semibold text-neutral-500">FitMate is not</p>
            <ul className="mt-5 space-y-4">
              {ISNT.map((item) => (
                <li key={item} className="flex items-center gap-3 text-neutral-500">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 dark:bg-neutral-800">
                    <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M5 5l10 10M15 5L5 15" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150} className="relative rounded-3xl border border-emerald-500/40 bg-white p-8 shadow-[0_0_60px_-20px_rgba(16,185,129,0.5)] dark:bg-neutral-900">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">FitMate is</p>
            <ul className="mt-5 space-y-4">
              {IS.map((item) => (
                <li key={item} className="flex items-center gap-3 font-medium">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- how it works

function HowItWorks() {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame;
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setProgress(Math.max(0, Math.min(1, (window.innerHeight * 0.6 - r.top) / r.height)));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="how" className="scroll-mt-20 px-5 py-28">
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center">
          <p className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">How it works</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Your plan in. Follow-through out.</h2>
        </Reveal>
        <ol ref={ref} className="relative mt-16 space-y-14 pl-14 sm:pl-20">
          <span className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-neutral-200 sm:left-[27px] dark:bg-neutral-800" />
          <span className="absolute top-2 left-[19px] w-0.5 origin-top bg-gradient-to-b from-emerald-500 to-sky-500 sm:left-[27px]" style={{ height: "calc(100% - 1rem)", transform: `scaleY(${progress})` }} />
          {STEPS.map(([title, text], i) => {
            const reached = progress >= i / STEPS.length + 0.05;
            return (
              <li key={title} className="relative">
                <span
                  className={`absolute top-0 -left-14 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 sm:-left-20 sm:h-14 sm:w-14 sm:text-lg ${
                    reached ? "scale-100 bg-emerald-600 text-white shadow-lg shadow-emerald-600/30" : "scale-90 border-2 border-neutral-300 bg-[var(--background)] text-neutral-400 dark:border-neutral-700"
                  }`}
                >
                  {i + 1}
                </span>
                <Reveal delay={100}>
                  <h3 className="text-2xl font-semibold">{title}</h3>
                  <p className="mt-2 max-w-xl leading-relaxed text-neutral-600 dark:text-neutral-400">{text}</p>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- features

function Features() {
  return (
    <section className="bg-neutral-100/60 px-5 py-28 dark:bg-neutral-900/40">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">Built for follow-through</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Every feature exists to keep you on the plan.</h2>
        </Reveal>
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <FeatureCard className="md:col-span-2" title="Today, not a 12-page PDF" text="Open the app and see today's workout and meals together. Warm-up, main work and cool-down are laid out in order, so you never guess what's next." delay={0}>
            <TodayVisual />
          </FeatureCard>
          <FeatureCard title="One tap per set" text="A big button logs your next set and starts the rest timer. Holds get a stopwatch. Five-minute “two-minute” rests stop happening." delay={100}>
            <TimerVisual />
          </FeatureCard>
          <FeatureCard title="Easy meals, right on target" text="Tick off simple meals with recipes and how-to videos, and watch protein and calories fill up against your targets." delay={0}>
            <BarsVisual />
          </FeatureCard>
          <FeatureCard className="md:col-span-2" title="Streaks and progress that keep you going" text="Every set and meal counts toward your streak. Progress charts, personal bests and past workouts show the gap early, while it's easy to close." delay={100}>
            <PlanVsActual />
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, text, children, className = "", delay }) {
  const ref = useRef(null);
  return (
    <Reveal delay={delay} className={`min-w-0 ${className}`}>
      <div
        ref={ref}
        onPointerMove={(e) => {
          const r = ref.current.getBoundingClientRect();
          ref.current.style.setProperty("--x", `${e.clientX - r.left}px`);
          ref.current.style.setProperty("--y", `${e.clientY - r.top}px`);
        }}
        className="group relative h-full overflow-hidden rounded-3xl bg-neutral-200 p-px dark:bg-neutral-800"
      >
        <div className="spotlight absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative flex h-full flex-col rounded-[23px] bg-white p-7 dark:bg-neutral-900">
          <div className="mb-6 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-950">{children}</div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">{text}</p>
        </div>
      </div>
    </Reveal>
  );
}

function TodayVisual() {
  const ref = useRef(null);
  const visible = useInView(ref);
  const rows = [
    ["Workout", "Pull Day · 5 exercises", true],
    ["Breakfast", "Oats + whey", true],
    ["Lunch", "Chicken & rice", false],
    ["Dinner", "Paneer & roti", false],
  ];
  return (
    <div ref={ref} className="grid w-full max-w-md gap-2 px-6">
      {rows.map(([slot, what, done], i) => (
        <div
          key={slot}
          className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-sm transition-all duration-500 dark:bg-neutral-900 ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          style={{ transitionDelay: `${200 + i * 110}ms` }}
        >
          <span className={`h-4 w-4 shrink-0 rounded transition-colors duration-500 ${done && visible ? "bg-emerald-500" : "border-2 border-neutral-300 dark:border-neutral-700"}`} style={{ transitionDelay: `${900 + i * 200}ms` }} />
          <span className="w-20 shrink-0 text-xs text-neutral-500">{slot}</span>
          <span className="truncate font-medium">{what}</span>
        </div>
      ))}
    </div>
  );
}

function TimerVisual() {
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 120 120" className="animate-spin-slow h-full w-full">
        <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-neutral-200 dark:stroke-neutral-800" />
        <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round" pathLength="100" strokeDasharray="68 100" className="stroke-emerald-500" />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">1:30</span>
        <span className="text-[10px] tracking-wider text-neutral-500 uppercase">then set 3</span>
      </span>
    </div>
  );
}

function BarsVisual() {
  const ref = useRef(null);
  const visible = useInView(ref);
  return (
    <div ref={ref} className="w-full space-y-4 px-6">
      {[
        ["Protein", "118 / 140 g", 84, "bg-emerald-500"],
        ["Calories", "1,650 / 2,400", 69, "bg-amber-500"],
      ].map(([label, value, pct, color], i) => (
        <div key={label}>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-medium">{label}</span>
            <span className="text-neutral-500">{value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div className={`h-full rounded-full ${color} transition-[width] duration-1000 ease-out`} style={{ width: visible ? `${pct}%` : 0, transitionDelay: `${300 + i * 200}ms` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Weekly sets: planned (outline) vs done (filled), with one slipping day called out.
function PlanVsActual() {
  const ref = useRef(null);
  const visible = useInView(ref);
  const week = [
    ["Mon", 16, 16],
    ["Tue", 14, 14],
    ["Wed", 0, 0],
    ["Thu", 16, 9],
    ["Fri", 14, 14],
    ["Sat", 12, 12],
    ["Sun", 0, 0],
  ];
  return (
    <div ref={ref} className="flex h-full w-full items-end justify-center gap-3 px-6 pt-6 pb-4 sm:gap-5">
      {week.map(([day, planned, done], i) => {
        const slipped = planned > 0 && done < planned;
        return (
          <div key={day} className="relative flex flex-col items-center gap-2">
            {slipped && visible && (
              <span className="animate-fade-up absolute -top-7 rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white [animation-delay:1400ms]">
                {done}/{planned} sets
              </span>
            )}
            <div className="relative flex h-24 w-6 items-end sm:w-8">
              {planned > 0 && <div className="absolute inset-x-0 bottom-0 rounded-md border-2 border-dashed border-neutral-300 dark:border-neutral-700" style={{ height: `${(planned / 16) * 100}%` }} />}
              <div
                className={`relative w-full origin-bottom rounded-md transition-transform duration-700 ease-out ${slipped ? "bg-rose-500" : "bg-emerald-500"}`}
                style={{ height: `${(done / 16) * 100}%`, transform: visible ? "scaleY(1)" : "scaleY(0)", transitionDelay: `${300 + i * 90}ms` }}
              />
            </div>
            <span className="text-[11px] text-neutral-500">{day}</span>
          </div>
        );
      })}
      <div className="ml-2 hidden flex-col gap-2 self-center text-[11px] text-neutral-500 sm:flex">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-neutral-400" /> Planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Done
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- faq + cta

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 px-5 py-28">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-4xl font-semibold tracking-tight">Questions</h2>
        </Reveal>
        <div className="mt-12 space-y-3">
          {FAQ.map(([q, a], i) => (
            <Reveal key={q} delay={i * 60}>
              <details className="group rounded-2xl border border-neutral-200 bg-white px-6 open:pb-5 dark:border-neutral-800 dark:bg-neutral-900" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium">
                  {q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-transform duration-300 group-open:rotate-45 dark:bg-neutral-800">+</span>
                </summary>
                <p className="leading-relaxed text-neutral-600 dark:text-neutral-400">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ signedIn }) {
  return (
    <section className="px-5 pb-28">
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-neutral-950 px-8 py-20 text-center text-white">
        <div className="bg-grid absolute inset-0 opacity-50" />
        <div className="animate-drift absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="animate-drift absolute -right-10 -bottom-24 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl [animation-delay:-7s]" />
        <div className="relative">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Stop planning.
            <br />
            <span className="text-emerald-400">Start following.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-neutral-400">Bring your plan or build one in minutes. FitMate handles today, every day after that, and shows you it&apos;s working.</p>
          <PrimaryCta signedIn={signedIn} className="mt-9 bg-emerald-500 text-neutral-950 shadow-emerald-500/30">
            Get started free
          </PrimaryCta>
        </div>
      </Reveal>
    </section>
  );
}
