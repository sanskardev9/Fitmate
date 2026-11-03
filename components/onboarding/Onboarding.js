"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/dexie";
import { getPreferences } from "@/lib/services/preferencesService";
import { saveProfile } from "@/lib/services/profileService";
import { useAuth, displayName } from "@/components/auth/AuthProvider";
import PlanImport from "@/components/common/PlanImport";
import Logo from "@/components/common/Logo";
import { primaryButton } from "@/components/common/ui";

// One screen, nothing required: drop in a plan (or don't) and start. Everything else
// (targets, profile details) is optional and lives where it's used.
export default function Onboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const plans = useLiveQuery(async () => {
    const prefs = await getPreferences();
    const [workout, diet] = await Promise.all([
      prefs.activeWorkoutPlanId ? db.workoutPlans.get(prefs.activeWorkoutPlanId) : null,
      prefs.activeDietPlanId ? db.dietPlans.get(prefs.activeDietPlanId) : null,
    ]);
    return { workout, diet };
  });

  const name = displayName(user);
  const hasAny = Boolean(plans?.workout || plans?.diet);

  async function start() {
    setStarting(true);
    setError("");
    try {
      await saveProfile(user.id, { full_name: name || "Athlete", onboarded_at: new Date().toISOString() });
      router.replace("/home");
    } catch (err) {
      setError(err.message || "Couldn't continue. Check your connection.");
      setStarting(false);
    }
  }

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <div className="bg-grid absolute inset-0 -z-10 opacity-60" />
      <div className="animate-drift absolute -top-32 left-1/4 -z-10 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
      </header>

      <main className="mx-auto max-w-5xl px-5 pt-6 pb-16 sm:pt-12">
        <div className="animate-fade-up text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Welcome{name ? `, ${name.split(" ")[0]}` : ""}.
            <br />
            <span className="text-gradient animate-shimmer">Let&apos;s bring in your plan.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-neutral-600 dark:text-neutral-400">Drop in the PDF or JSON you already have. FitMate reads it and sets up your days.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <PlanSlot kind="workout" title="Workout plan" plan={plans?.workout} delay={100} />
          <PlanSlot kind="diet" title="Diet plan" plan={plans?.diet} delay={200} />
        </div>

        {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}

        <div className="animate-fade-up mt-10 flex flex-col items-center gap-3 [animation-delay:300ms]">
          <button type="button" onClick={start} disabled={starting} className={`${primaryButton} min-w-64 px-8 py-4`}>
            {starting ? "Starting…" : "Start following →"}
          </button>
          {!hasAny && <p className="text-sm text-neutral-500">No plan handy? Start anyway and add it whenever you like.</p>}
        </div>
      </main>
    </div>
  );
}

function PlanSlot({ kind, title, plan, delay }) {
  return (
    <section className="animate-fade-up rounded-3xl border border-neutral-200 bg-white/80 p-6 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {plan && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">✓ Added</span>}
      </div>
      {plan ? (
        <div className="rounded-2xl bg-emerald-500/5 p-5 ring-1 ring-emerald-500/30">
          <p className="text-lg font-semibold">{plan.name}</p>
          <p className="mt-1 text-sm text-neutral-500">Ready to follow. You can edit it any time from Plans.</p>
        </div>
      ) : (
        <PlanImport kind={kind} returnTo="/onboarding" manualHref={`/plans/${kind}/new?return=${encodeURIComponent("/onboarding")}`} showGuide={false} />
      )}
    </section>
  );
}
