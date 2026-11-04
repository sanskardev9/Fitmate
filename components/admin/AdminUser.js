"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useDeleteUser } from "./useDeleteUser";
import { Flame, CalendarCheck, Dumbbell, Utensils, Layers, ChevronRight, Trash2 } from "lucide-react";
import { useAdminData, adminApi } from "./AdminShell";
import { card, GOAL, lastDays, fullDate, ago, userName, Avatar, PageTitle, Stat, Section, Skeleton } from "./ui";

const BACK = { href: "/admin/users", label: "Users" };

export default function AdminUser({ id }) {
  const { users } = useAdminData();
  const { user: me } = useAuth();
  const router = useRouter();
  const del = useDeleteUser();
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    adminApi(`/api/admin/users/${id}`)
      .then(setDetail)
      .catch(() => setDetail({ workouts: [], mealDays: [] }));
  }, [id]);

  if (!users) return <Skeleton className="h-96" />;
  const u = users.find((x) => x.user_id === id);
  if (!u) return <PageTitle title="User not found" back={BACK} />;

  const age = u.date_of_birth ? Math.floor((Date.now() - new Date(u.date_of_birth)) / 31_557_600_000) : null;
  const active = new Set((u.active_days ?? []).map(String));
  const weeks = lastDays(84);
  async function remove() {
    if (await del.remove(u)) router.replace("/admin/users");
  }
  const deleting = del.busyId === u.user_id;
  const delError = del.error;
  const isSelf = me?.id === u.user_id;

  const plans = [...u.plans].sort((a, b) => Number(a.archived) - Number(b.archived) || (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return (
    <>
      <PageTitle back={BACK} title={userName(u)} sub={`${u.email} · joined ${fullDate(u.created_at)} · last active ${ago(u.last_sync)}`}>
        <Avatar user={u} size="h-14 w-14 text-xl" />
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Streak" value={`${u.streak} d`} Icon={Flame} tone="orange" />
        <Stat label="Active days (14d)" value={`${u.active_last_14} / 14`} Icon={CalendarCheck} tone="violet" />
        <Stat label="Workouts" value={u.workouts} Icon={Dumbbell} />
        <Stat label="Sets logged" value={u.sets} Icon={Layers} tone="sky" />
        <Stat label="Meals logged" value={u.meal_logs} Icon={Utensils} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Activity" sub="Last 12 weeks · green = finished a workout or logged a meal">
          <div className="grid grid-flow-col grid-rows-7 gap-1">
            {weeks.map((d) => (
              <span key={d} title={d} className={`aspect-square rounded-[4px] ${active.has(d) ? "bg-emerald-500" : "bg-neutral-100 dark:bg-neutral-800"}`} />
            ))}
          </div>
        </Section>

        <Section title="Profile">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[
              ["Goal", GOAL[u.goal] ?? "–"],
              ["Own goal", u.goal_note || "–"],
              ["Gender", u.gender ?? "–"],
              ["Age", age ?? "–"],
              ["Height", u.height_cm ? `${u.height_cm} cm` : "–"],
              ["Weight", u.weight_kg ? `${u.weight_kg} kg` : "–"],
              ["Target weight", u.target_weight_kg ? `${u.target_weight_kg} kg` : "–"],
              ["Training days", u.training_days_per_week != null ? `${u.training_days_per_week} / week` : "–"],
              ["Calories", u.calories_target ? `${u.calories_target} kcal` : "–"],
              ["Protein", u.protein_target_g ? `${u.protein_target_g} g` : "–"],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-neutral-500">{k}</dt>
                <dd className="font-medium break-words capitalize">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <Section title="Plans" sub="Tap a plan to see every day as the user built it" className="mt-4">
        {plans.length === 0 && <p className="text-sm text-neutral-500">No plans yet.</p>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {plans.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/users/${u.user_id}/plans/${p.id}`} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 dark:border-neutral-800">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.kind === "workout" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                  {p.kind === "workout" ? <Dumbbell className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold break-words">{p.name}</span>
                  <span className="text-xs text-neutral-500">
                    {p.kind === "workout" ? "Workout" : "Diet"} plan{p.createdAt ? ` · ${fullDate(p.createdAt)}` : ""}
                    {p.archived && " · archived"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Recent workouts">
          {!detail ? (
            <Skeleton className="h-32" />
          ) : detail.workouts.length === 0 ? (
            <p className="text-sm text-neutral-500">None yet.</p>
          ) : (
            <ul className="-my-2 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
              {detail.workouts.map((w, i) => {
                const pct = w.planned ? Math.min(100, Math.round((w.sets / w.planned) * 100)) : null;
                return (
                  <li key={i} className="py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-medium break-words">{w.name}</span>
                        <span className="text-xs text-neutral-500">
                          {fullDate(w.startedAt)} · {w.finished ? `${w.minutes} min` : "not finished"}
                        </span>
                      </span>
                      <span className={`shrink-0 text-xs font-semibold tabular-nums ${pct === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                        {w.sets}/{w.planned || "–"} sets
                      </span>
                    </div>
                    {pct != null && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className={`h-1.5 rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Meals logged" sub="Per day">
          {!detail ? (
            <Skeleton className="h-32" />
          ) : detail.mealDays.length === 0 ? (
            <p className="text-sm text-neutral-500">None yet.</p>
          ) : (
            <ul className="-my-2 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
              {detail.mealDays.map((d) => (
                <li key={d.date} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2.5">
                  <span className="font-medium">{fullDate(d.date)}</span>
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {d.count} meals · {Math.round(d.protein)} g protein · {Math.round(d.calories)} kcal
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {!isSelf && (
        <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-rose-700 dark:text-rose-300">Delete this user</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Removes the account and all of its data for good. Admin accounts can&apos;t be deleted here.</p>
            {delError && <p className="mt-1 text-sm text-rose-600">{delError}</p>}
          </div>
          <button type="button" disabled={deleting} onClick={remove} className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
            <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete user"}
          </button>
        </section>
      )}
    </>
  );
}

