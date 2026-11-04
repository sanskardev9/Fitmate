"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, LogOut, KeyRound, User, Ruler, Weight, Target, CalendarDays, Dumbbell, Beef, Flame, Goal } from "lucide-react";
import { useAuth, displayName } from "./AuthProvider";
import { cachedProfile, fetchProfile } from "@/lib/services/profileService";
import { SyncStatus } from "./AccountButton";
import TargetsForm from "@/components/targets/TargetsForm";
import FeedbackCard from "@/components/feedback/FeedbackCard";
import NotificationsCard from "./NotificationsCard";
import ShareCard from "@/components/common/ShareCard";
import { focusLabel } from "@/lib/focuses";
import AdminSwitch from "@/components/admin/AdminSwitch";

const GOAL_LABEL = { lose_fat: "Lose fat", recomposition: "Build muscle & lose fat", build_muscle: "Build muscle", gain_strength: "Get stronger", calisthenics_skills: "Calisthenics skills", maintain: "Maintain", general_fitness: "General fitness" };

export async function signOutToWebsite(signOut) {
  sessionStorage.setItem("fitmate:signed-out", "1");
  try {
    await signOut();
  } finally {
    window.location.replace("/");
  }
}

// Everything we know about the user, with edit and sign out.
export default function ProfileView() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile(cachedProfile(user.id));
    fetchProfile(user.id).then((p) => p && setProfile(p)).catch(() => {});
  }, [user, editing]);

  if (!user) return null;
  const p = profile ?? {};
  const name = p.full_name || displayName(user);
  const age = p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth)) / 31_557_600_000) : null;
  const rows = [
    [User, "Gender", p.gender ? p.gender[0].toUpperCase() + p.gender.slice(1) : null],
    [CalendarDays, "Age", age ? `${age} years` : null],
    [Ruler, "Height", p.height_cm ? `${p.height_cm} cm` : null],
    [Weight, "Weight", p.weight_kg ? `${p.weight_kg} kg` : null],
    [Target, "Target weight", p.target_weight_kg ? `${p.target_weight_kg} kg` : null],
    [Goal, "Goal", GOAL_LABEL[p.goal] ?? null],
    [Target, "Also want to", p.focuses?.length ? p.focuses.map(focusLabel).join(", ") : null],
    [Dumbbell, "Training days", p.training_days_per_week != null ? `${p.training_days_per_week} per week` : null],
  ];

  return (
    <div className="space-y-4">
      <section className="flex items-center gap-4 rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white">{name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold break-words">{name}</h1>
          <p className="truncate text-sm text-neutral-500">{user.email}</p>
          <div className="mt-1">
            <SyncStatus />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Target2 Icon={Beef} tint="text-amber-500" value={p.protein_target_g ? `${p.protein_target_g} g` : "–"} label="Protein a day" />
        <Target2 Icon={Flame} tint="text-orange-500" value={p.calories_target ? `${p.calories_target.toLocaleString()}` : "–"} label="Calories a day" />
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">About you</h2>
          <button type="button" onClick={() => setEditing((v) => !v)} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
            <Pencil className="h-4 w-4" /> {editing ? "Close" : "Edit"}
          </button>
        </div>
        {editing ? (
          <div className="animate-fade-up mt-4">
            <TargetsForm onSaved={() => setEditing(false)} />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map(([Icon, label, value]) => (
              <li key={label} className="flex items-center gap-3 py-3 text-sm">
                <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
                <span className="flex-1 text-neutral-500">{label}</span>
                <span className={value ? "font-medium" : "text-neutral-400"}>{value ?? "Not set"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NotificationsCard />

      <ShareCard />

      <FeedbackCard />

      <AdminSwitch />

      <Link href="/reset-password" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 py-3.5 font-semibold hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
        <KeyRound className="h-5 w-5" /> Change password
      </Link>

      <button
        type="button"
        onClick={() => signOutToWebsite(signOut)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 py-3.5 font-semibold text-red-600 hover:bg-red-500/5"
      >
        <LogOut className="h-5 w-5" /> Sign out
      </button>
    </div>
  );
}

function Target2({ Icon, tint, value, label }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Icon className={`h-5 w-5 ${tint}`} />
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
