"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/dexie";
import { getPreferences } from "@/lib/services/preferencesService";
import { saveProfile, cachedProfile, fetchProfile } from "@/lib/services/profileService";
import AboutYou, { missingAbout, aboutFromProfile, saveAbout } from "@/components/common/AboutYou";
import { useAuth, displayName } from "@/components/auth/AuthProvider";
import PlanImport from "@/components/common/PlanImport";
import Logo from "@/components/common/Logo";
import { primaryButton } from "@/components/common/ui";

// Two quick steps: 1) about you (needed for accurate targets and AI plans), 2) bring in or make a plan.
export default function Onboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [about, setAbout] = useState(aboutFromProfile(null));
  const [aboutError, setAboutError] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);

  useEffect(() => {
    if (!user) return;
    const local = cachedProfile(user.id);
    setProfile(local);
    setAbout(aboutFromProfile(local, { draft: true }));
    fetchProfile(user.id)
      .then((p) => {
        if (!p) return;
        setProfile(p);
        setAbout(aboutFromProfile(p, { draft: true }));
      })
      .catch(() => {});
  }, [user]);

  const step = missingAbout(profile).length ? "about" : "plans";

  async function continueAbout() {
    setSavingAbout(true);
    const r = await saveAbout({ userId: user.id, name: displayName(user), about });
    setSavingAbout(false);
    if (r.error) return setAboutError(r.error);
    setAboutError("");
    setProfile(r.profile);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
            <span className="text-gradient animate-shimmer">{step === "about" ? "First, a little about you." : "Let's bring in your plan."}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-neutral-600 dark:text-neutral-400">
            {step === "about" ? "Takes 20 seconds. It sets your daily calories and protein, so every plan fits you." : "Already have a plan? Bring it in. No plan yet? We'll help you make one."}
          </p>
          <p className="mt-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Step {step === "about" ? 1 : 2} of 2</p>
        </div>

        {step === "about" ? (
          <div className="animate-fade-up mx-auto mt-8 max-w-4xl [animation-delay:100ms]">
            <AboutYou value={about} onChange={setAbout} error={aboutError} />
            <button type="button" onClick={continueAbout} disabled={savingAbout} className={`${primaryButton} mx-auto mt-5 block w-full max-w-md py-4`}>
              {savingAbout ? "Saving…" : "Continue →"}
            </button>
          </div>
        ) : (
        <>

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
        </>
        )}
      </main>
    </div>
  );
}

function PlanSlot({ kind, title, plan, delay }) {
  return (
    <section className="animate-fade-up min-w-0 rounded-3xl border border-neutral-200 bg-white/80 p-6 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80" style={{ animationDelay: `${delay}ms` }}>
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
