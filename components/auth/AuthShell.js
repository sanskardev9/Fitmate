import Link from "next/link";
import Logo, { LogoMark } from "@/components/common/Logo";
import ThemeToggle from "@/components/common/ThemeToggle";

const POINTS = [
  ["Bring the plan you already have", "Import your coach's PDF or JSON, or type it in once."],
  ["Follow today, not the whole plan", "A daily checklist, one-tap set logging and an automatic rest timer."],
  ["See your follow-through", "Planned vs. done for every set and meal, so slips don't add up."],
];

// Full-screen layout for auth pages: brand panel on large screens, form on the right.
export default function AuthShell({ children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-neutral-200 bg-white p-12 text-neutral-900 lg:flex dark:border-neutral-800 dark:bg-neutral-950 dark:text-white lg:flex-col">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="animate-drift absolute -top-20 -left-20 h-96 w-96 rounded-full bg-emerald-400/25 blur-3xl dark:bg-emerald-500/30" />
        <div className="animate-drift absolute right-[-10%] bottom-[-10%] h-96 w-96 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/20 [animation-delay:-8s]" />

        <Link href="/" className="relative flex items-center gap-2">
          <LogoMark className="h-9 w-9" />
          <span className="text-xl font-bold">
            Fit<span className="text-emerald-600 dark:text-emerald-400">Mate</span>
          </span>
        </Link>

        <div className="relative my-auto max-w-md">
          <h2 className="animate-fade-up text-4xl leading-tight font-semibold tracking-tight">
            You made the plan.
            <br />
            <span className="text-gradient animate-shimmer">Now follow it.</span>
          </h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(([title, text], i) => (
              <li key={title} className="animate-fade-up flex gap-4" style={{ animationDelay: `${150 + i * 120}ms` }}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="mt-0.5 block text-sm text-neutral-600 dark:text-neutral-400">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-neutral-500 dark:text-neutral-500">FitMate doesn&apos;t make plans. It helps you follow yours.</p>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-10">{children}</div>
      </main>
    </div>
  );
}
