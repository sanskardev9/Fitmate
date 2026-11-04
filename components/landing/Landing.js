"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogoMark } from "@/components/common/Logo";
import { Backdrop, Arrow } from "@/components/dashboard/Welcome";
import Reveal, { useInView } from "./Reveal";
import { FileText, CircleHelp, Gauge, CircleOff, Check, Timer, Repeat2, Flame } from "lucide-react";
import ThemeToggle from "@/components/common/ThemeToggle";

// One message: getting a plan is easy, staying consistent is hard. FitMate makes every day easy
// to follow. Sections: what we do -> the problem -> how we fix it -> why it matters -> start.


export default function Landing() {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  return (
    <div className="relative overflow-x-clip">
      <ScrollProgress />
      <Nav signedIn={signedIn} />
      <Hero signedIn={signedIn} />
      <Problem />
      <How />
      <Matters />
      <FinalCta signedIn={signedIn} />
      <footer className="border-t border-neutral-200 px-6 py-8 text-center text-sm text-neutral-500 dark:border-neutral-800">
        <div className="mb-2 flex items-center justify-center gap-2">
          <LogoMark className="h-6 w-6" />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">FitMate</span>
        </div>
        Show up every day. That&apos;s the whole secret.
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
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-5">
        <a href="#top" className="flex shrink-0 items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">
            Fit<span className="text-emerald-600 dark:text-emerald-400">Mate</span>
          </span>
        </a>
        <div className="hidden items-center gap-8 text-sm text-neutral-600 md:flex dark:text-neutral-400">
          {[
            ["#problem", "Why"],
            ["#how", "How it works"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="transition-colors hover:text-neutral-900 dark:hover:text-white">
              {label}
            </a>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/home" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white sm:px-4">
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900">
                Log in
              </Link>
              <Link href="/login?mode=signup" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white sm:px-4">
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

// ---------------------------------------------------------------- 1. what we do

function Hero({ signedIn }) {
  return (
    <section id="top" className="relative isolate flex min-h-[100svh] flex-col justify-center px-5 pt-24 pb-12">
      <Backdrop />
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1fr]">
        <div className="min-w-0 text-center lg:text-left">
          <h1 className="animate-fade-up mt-5 text-[2.6rem] leading-[1.05] font-semibold tracking-tight [animation-delay:100ms] sm:text-6xl">
            You made the plan.
            <br />
            <span className="text-gradient animate-shimmer">Following it is the hard part.</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-5 max-w-md text-lg text-neutral-600 [animation-delay:200ms] lg:mx-0 dark:text-neutral-400">
            Most of us start strong, then quietly slip. FitMate exists to make sticking to your workout and diet feel easy.
          </p>
          {/* No sign-up push here: invite them to read the story first. */}
          <a href="#problem" className="group animate-fade-up mt-8 inline-flex items-center gap-2 font-semibold text-emerald-700 [animation-delay:300ms] dark:text-emerald-400">
            Why it&apos;s hard
            <span className="inline-block transition-transform group-hover:translate-y-0.5 motion-safe:animate-bounce">↓</span>
          </a>
        </div>
        <TodayPhone />
      </div>
    </section>
  );
}




// ---------------------------------------------------------------- 2. the problem

// One timeline: how it slips, with the reason behind each step right next to it.
const SLIP_STEPS = [
  { day: "Day 1", what: "All in.", why: "Motivation is high. Everything feels easy.", pct: 100, Icon: Flame },
  { day: "Day 4", what: "Skipped a few sets.", why: "The plan lives in a PDF or a chat, not in front of you.", pct: 75, Icon: FileText },
  { day: "Day 9", what: "Forgot what's next.", why: "Mid-workout: which exercise, how many reps, how long was that rest?", pct: 50, Icon: CircleHelp },
  { day: "Day 14", what: "Guessing meals.", why: "No easy way to see if today was on track.", pct: 25, Icon: Gauge },
  { day: "Day 21", what: "Stopped.", why: "Small misses became the habit.", pct: 5, Icon: CircleOff },
];

function Problem() {
  const ref = useRef(null);
  const visible = useInView(ref, { threshold: 0.1 });
  const tone = (pct) => (pct >= 75 ? "emerald" : pct >= 40 ? "amber" : "rose");
  const dot = { emerald: "bg-emerald-500 text-white", amber: "bg-amber-500 text-white", rose: "bg-rose-500 text-white" };
  const bar = { emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500" };
  return (
    <section id="problem" className="flex min-h-[100svh] flex-col justify-center border-t border-neutral-200 px-5 py-20 dark:border-neutral-800">
      <div className="mx-auto w-full max-w-3xl">
        <Reveal className="text-center">
          <p className="text-sm font-semibold tracking-wider text-rose-500 uppercase">Sound familiar?</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">You didn&apos;t fail. Following a plan is just hard.</h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">It never ends in one day. It slips, one small miss at a time.</p>
        </Reveal>

        <ol ref={ref} className="relative mt-12 space-y-3">
          {/* Line that drains from green to red as the days go by. */}
          <span className="absolute top-6 bottom-6 left-[1.4rem] w-0.5 bg-gradient-to-b from-emerald-500 via-amber-500 to-rose-500 opacity-30 sm:left-[1.65rem]" />
          {SLIP_STEPS.map((s, i) => {
            const t = tone(s.pct);
            return (
              <li
                key={s.day}
                className={`relative flex items-start gap-4 transition-all duration-700 ease-out ${visible ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`}
                style={{ transitionDelay: `${i * 160}ms` }}
              >
                <span className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm ring-4 ring-[var(--background)] sm:h-14 sm:w-14 ${dot[t]}`}>
                  <s.Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3 sm:px-5 sm:py-4 dark:border-neutral-800 dark:bg-neutral-900" style={{ opacity: 0.55 + s.pct / 222 }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold">
                      <span className="mr-2 text-xs font-semibold text-neutral-500">{s.day}</span>
                      {s.what}
                    </p>
                    <span className="shrink-0 text-xs font-semibold text-neutral-400 tabular-nums">{s.pct}%</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">{s.why}</p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className={`h-full rounded-full transition-[width] duration-1000 ease-out ${bar[t]}`} style={{ width: visible ? `${s.pct}%` : "100%", transitionDelay: `${400 + i * 160}ms` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 pl-[3.75rem] text-xs text-neutral-500 sm:pl-[4.5rem]">% = how much of the plan still gets followed</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 3. how we fix it

function How() {
  const steps = [
    ["1", "Get your plan", "Import it, or build one with AI in a minute.", <PlanVisual key="p" />],
    ["2", "Follow today", "One tap per set. One tick per meal.", <TodayVisual key="t" />],
    ["3", "Keep the streak", "Every day you show up, it grows.", <StreakVisual key="s" />],
  ];
  return (
    <section id="how" className="flex min-h-[100svh] flex-col justify-center bg-neutral-100/60 px-5 py-20 dark:bg-neutral-900/40">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">What we do about it</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">We take the friction out of every day.</h2>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {steps.map(([n, title, text, visual], i) => (
            <Reveal key={n} delay={i * 120} className="min-w-0">
              <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex h-44 items-center justify-center bg-neutral-50 sm:h-52 dark:bg-neutral-950">{visual}</div>
                <div className="p-6">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">{n}</span>
                  <h3 className="mt-3 text-xl font-semibold">{title}</h3>
                  <p className="mt-1 text-neutral-500">{text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanVisual() {
  const ref = useRef(null);
  const visible = useInView(ref);
  const items = [
    ["Your coach's PDF", "bg-sky-500/10 text-sky-600"],
    ["A plan from ChatGPT", "bg-violet-500/10 text-violet-600"],
    ["Built for you by AI", "bg-amber-500/10 text-amber-600"],
  ];
  return (
    <div ref={ref} className="flex w-full max-w-xs flex-col gap-2 px-6">
      {items.map(([label, tint], i) => (
        <div
          key={label}
          className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-medium shadow-sm transition-all duration-500 dark:bg-neutral-900 ${visible ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"}`}
          style={{ transitionDelay: `${150 + i * 140}ms` }}
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${tint}`}>{["PDF", "AI", "✦"][i]}</span>
          {label}
          <span className="ml-auto text-emerald-600">→</span>
        </div>
      ))}
    </div>
  );
}

function TodayVisual() {
  const ref = useRef(null);
  const visible = useInView(ref);
  const rows = [
    ["Pull-ups", "4 × 8", true],
    ["Dips", "3 × 10", true],
    ["Breakfast", "Masala oats", true],
    ["Lunch", "Rajma rice", false],
  ];
  return (
    <div ref={ref} className="grid w-full max-w-xs gap-2 px-6">
      {rows.map(([what, detail, done], i) => (
        <div
          key={what}
          className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-sm transition-all duration-500 dark:bg-neutral-900 ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          style={{ transitionDelay: `${150 + i * 110}ms` }}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white transition-colors duration-500 ${done && visible ? "bg-emerald-500" : "border-2 border-neutral-300 dark:border-neutral-700"}`}
            style={{ transitionDelay: `${800 + i * 220}ms` }}
          >
            {done && visible ? "✓" : ""}
          </span>
          <span className="truncate font-medium">{what}</span>
          <span className="ml-auto shrink-0 text-xs text-neutral-500">{detail}</span>
        </div>
      ))}
    </div>
  );
}

function StreakVisual() {
  const ref = useRef(null);
  const visible = useInView(ref);
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div ref={ref} className="flex flex-col items-center gap-4 px-6">
      <p className="text-5xl font-extrabold tabular-nums">
        {visible ? 6 : 0}
        <span className="ml-1 text-base font-semibold text-orange-500">day streak</span>
      </p>
      <div className="flex gap-1.5">
        {days.map((d, i) => {
          const lit = i < 6;
          return (
            <span key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-neutral-400">{d}</span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-500 ${lit && visible ? "scale-100 bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/30" : "scale-90 border-2 border-neutral-200 dark:border-neutral-800"}`}
                style={{ transitionDelay: `${200 + i * 140}ms` }}
              >
                {lit && visible ? "🔥" : ""}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 4. why it matters

function Matters() {
  return (
    <section className="flex min-h-[100svh] flex-col justify-center px-5 py-20">
      <div className="mx-auto max-w-4xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">Why it matters</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Small days add up.</h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">No plan changes you on paper. The change happens in the ordinary days you actually follow it.</p>
        </Reveal>
        <EffortCompare />
      </div>
    </section>
  );
}

// Making the plan (one square) vs. following it: 12 weeks of days filling in one by one (loops).
function EffortCompare() {
  const ref = useRef(null);
  const visible = useInView(ref, { threshold: 0.3 });
  const WEEKS = 12;
  const TOTAL = WEEKS * 7;
  const [day, setDay] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setDay(TOTAL);
    let d = 0;
    let hold = 0;
    setDay(0);
    const t = setInterval(() => {
      if (d < TOTAL) setDay(++d);
      else if (++hold > 40) {
        d = 0;
        hold = 0;
        setDay(0);
      }
    }, 55);
    return () => clearInterval(t);
  }, [visible, TOTAL]);

  const done = day >= TOTAL;
  const week = Math.min(WEEKS, Math.max(1, Math.ceil(day / 7)));

  return (
    <div ref={ref} className="mx-auto mt-14 max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 sm:p-10 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">Making the plan</p>
        <span className="flex items-center gap-2 text-sm text-neutral-500">
          <span className="h-4 w-4 rounded-[4px] bg-violet-500" /> 1 day
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm font-medium">Following it</p>
        <span className="text-sm text-emerald-600 tabular-nums dark:text-emerald-400">
          {day ? `Day ${day} · Week ${week}` : "Day 1"}
        </span>
      </div>

      <div className="mt-3 flex justify-center">
        <div className="w-fit">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1.25rem))` }}>
          {Array.from({ length: TOTAL }, (_, i) => {
            const on = i < day;
            const last = i === TOTAL - 1 && done;
            return (
              <span
                key={i}
                className={`aspect-square w-full max-w-5 rounded-[4px] transition-all duration-200 ${on ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-800"} ${last ? "scale-125 shadow-lg shadow-emerald-500/40" : on && i === day - 1 ? "scale-110" : "scale-100"}`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
          <span>Week 1</span>
          <span>Week 12</span>
        </div>
        </div>
      </div>

      <p className="mt-8 border-t border-neutral-200 pt-6 text-center text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        {done ? (
          <span className="animate-fade-up font-semibold text-neutral-900 dark:text-neutral-100">12 weeks. Every one of them counted.</span>
        ) : (
          <>
            Every square is a day you followed the plan. <span className="font-semibold text-neutral-900 dark:text-neutral-100">That&apos;s where the change happens.</span>
          </>
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- 5. start

function FinalCta({ signedIn }) {
  const pieces = [
    [Check, "One tap per set"],
    [Timer, "Rest timer that runs itself"],
    [Repeat2, "Swap any meal, stay on target"],
    [Flame, "A streak you won't want to break"],
  ];
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden border-t border-neutral-200 bg-gradient-to-b from-emerald-50/60 to-[var(--background)] px-5 py-24 dark:border-neutral-800 dark:from-neutral-950 dark:to-neutral-950 dark:text-white">
      <div className="bg-grid absolute inset-0 -z-10 opacity-60 dark:opacity-40" />
      <div className="animate-drift absolute top-1/4 left-1/4 -z-10 h-[28rem] w-[28rem] rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/25" />
      <div className="animate-drift absolute right-1/5 bottom-1/5 -z-10 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl [animation-delay:-8s]" />

      <div className="mx-auto w-full max-w-4xl text-center">
        <Reveal>
          <p className="text-sm font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">Built for the everyday</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Your plan already works.
            <br />
            <span className="text-gradient animate-shimmer">Let&apos;s make it easy to follow.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-neutral-600 dark:text-neutral-400">One day at a time, until it&apos;s simply who you are.</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {pieces.map(([Icon, label], i) => (
            <Reveal key={label} delay={150 + i * 110}>
              <div className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white/80 px-4 py-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:shadow-none dark:hover:bg-white/10">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 transition-transform dark:text-emerald-400 duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={600}>
          <PrimaryCta signedIn={signedIn} className="mt-12">
            Try FitMate
          </PrimaryCta>
        </Reveal>
      </div>
    </section>
  );
}

// Hero visual: FitMate's Today screen. Items tick off one by one; the streak lights up at the end.
const TODAY_ITEMS = [
  ["Workout", "Pull-ups", "4 × 8"],
  ["Workout", "Dips", "3 × 10"],
  ["Breakfast", "Masala oats", "36 g protein"],
  ["Lunch", "Rajma rice", "36 g protein"],
  ["Dinner", "Paneer roti", "38 g protein"],
];

function TodayPhone() {
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setDone(TODAY_ITEMS.length);
    const t = setInterval(() => setDone((d) => (d >= TODAY_ITEMS.length + 3 ? 0 : d + 1)), 900);
    return () => clearInterval(t);
  }, []);
  const ticked = Math.min(done, TODAY_ITEMS.length);
  const all = ticked === TODAY_ITEMS.length;
  return (
    <div className="animate-fade-up relative mx-auto w-full max-w-[22rem] [animation-delay:200ms]">
      <div className="rounded-[2.2rem] border border-neutral-200 bg-white p-5 shadow-2xl shadow-emerald-900/10 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Today</p>
            <p className="text-lg font-semibold">Your plan</p>
          </div>
          <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold tabular-nums transition-colors duration-500 ${all ? "bg-orange-500/15 text-orange-600" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"}`}>
            🔥 {all ? 7 : 6}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(ticked / TODAY_ITEMS.length) * 100}%` }} />
        </div>
        <ul className="mt-4 space-y-2">
          {TODAY_ITEMS.map(([slot, name, detail], i) => {
            const on = i < ticked;
            return (
              <li key={name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-500 ${on ? "bg-emerald-500/10" : "bg-neutral-50 dark:bg-neutral-950"}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white transition-all duration-300 ${on ? "scale-100 bg-emerald-500" : "scale-95 border-2 border-neutral-300 dark:border-neutral-700"}`}>{on ? "✓" : ""}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">{slot}</span>
                  <span className={`block truncate text-sm font-medium ${on ? "text-neutral-400 line-through" : ""}`}>{name}</span>
                </span>
                <span className="shrink-0 text-xs text-neutral-500">{detail}</span>
              </li>
            );
          })}
        </ul>
        <p className={`mt-4 text-center text-sm font-semibold transition-opacity duration-500 ${all ? "text-emerald-600 opacity-100" : "opacity-0"}`}>Day done. Streak +1 🔥</p>
      </div>
    </div>
  );
}
