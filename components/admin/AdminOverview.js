"use client";

import Link from "next/link";
import { Users, Activity, CalendarCheck, Flame, Dumbbell, Utensils, ClipboardList, Star, ChevronRight } from "lucide-react";
import { useAdminData } from "./AdminShell";
import { card, GOAL, lastDays, shortDate, ago, userName, activeWithin, Avatar, PageTitle, Stat, Section, Skeleton, ColumnChart, BarList } from "./ui";

export default function AdminOverview() {
  const { users, feedback } = useAdminData();
  if (!users) {
    return (
      <>
        <PageTitle title="Overview" sub="How FitMate is doing" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
        <Skeleton className="mt-4 h-64" />
      </>
    );
  }

  const n = users.length;
  const days30 = lastDays(30);
  const today = days30[29];
  const week = new Set(days30.slice(-7));
  const activeToday = users.filter((u) => (u.active_days ?? []).map(String).includes(today)).length;
  const active7 = users.filter((u) => activeWithin(u, 7)).length;
  const newThisWeek = users.filter((u) => week.has(new Date(u.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }))).length;
  const sum = (k) => users.reduce((t, u) => t + Number(u[k] ?? 0), 0);
  const plans = users.flatMap((u) => u.plans.filter((p) => !p.archived));
  const rated = (feedback ?? []).filter((f) => f.rating);
  const avg = rated.length ? (rated.reduce((t, f) => t + f.rating, 0) / rated.length).toFixed(1) : "–";

  const dau = days30.map((d) => ({ label: shortDate(d), value: users.filter((u) => (u.active_days ?? []).map(String).includes(d)).length }));
  const signups = days30.map((d) => ({
    label: shortDate(d),
    value: users.filter((u) => new Date(u.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === d).length,
  }));

  const funnel = [
    { label: "Signed up", value: n },
    { label: "Finished setup", value: users.filter((u) => u.onboarded_at).length },
    { label: "Added a plan", value: users.filter((u) => u.plans.some((p) => !p.archived)).length },
    { label: "Logged a workout or meal", value: users.filter((u) => (u.active_days ?? []).length).length },
    { label: "Active this week", value: active7 },
  ];
  const goals = Object.entries(
    users.reduce((m, u) => {
      const g = GOAL[u.goal] ?? "Not set";
      m[g] = (m[g] ?? 0) + 1;
      return m;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const streaks = [...users].filter((u) => u.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 5);
  const recent = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const latest = (feedback ?? []).slice(0, 3);

  return (
    <>
      <PageTitle title="Overview" sub={`How FitMate is doing · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={n} hint={`+${newThisWeek} this week`} Icon={Users} />
        <Stat label="Active today" value={activeToday} hint="Logged a workout or meal" Icon={Activity} tone="sky" />
        <Stat label="Active this week" value={active7} hint={`${n ? Math.round((active7 / n) * 100) : 0}% of users`} Icon={CalendarCheck} tone="violet" />
        <Stat label="On a streak" value={users.filter((u) => u.streak > 0).length} hint={`Best: ${Math.max(0, ...users.map((u) => u.streak))} days`} Icon={Flame} tone="orange" />
        <Stat label="Workouts finished" value={sum("workouts")} hint={`${sum("sets")} sets logged`} Icon={Dumbbell} />
        <Stat label="Meals logged" value={sum("meal_logs")} Icon={Utensils} tone="amber" />
        <Stat label="Plans in use" value={plans.length} hint={`${plans.filter((p) => p.kind === "workout").length} workout · ${plans.filter((p) => p.kind === "diet").length} diet`} Icon={ClipboardList} tone="sky" />
        <Stat label="Average rating" value={avg === "–" ? "–" : `${avg} ★`} hint={`${rated.length} ratings`} Icon={Star} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Daily active users" sub="People who logged a workout or meal · last 30 days">
          <ColumnChart data={dau} />
        </Section>
        <Section title="New sign-ups" sub="Last 30 days">
          <ColumnChart data={signups} />
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Where people drop off" sub="Share of everyone who signed up">
          <BarList rows={funnel} total={n} />
        </Section>
        <Section title="Goals" sub="What people want from FitMate">
          <BarList rows={goals} total={n} />
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Longest streaks" action={<MoreLink href="/admin/users" />}>
          <PeopleList users={streaks} empty="Nobody is on a streak yet." right={(u) => <span className="flex items-center gap-1 text-sm font-bold text-orange-600 tabular-nums"><Flame className="h-4 w-4" />{u.streak}</span>} />
        </Section>
        <Section title="Newest users" action={<MoreLink href="/admin/users" />}>
          <PeopleList users={recent} empty="No users yet." right={(u) => <span className="text-xs text-neutral-500">{ago(u.created_at)}</span>} />
        </Section>
        <Section title="Latest feedback" action={<MoreLink href="/admin/feedback" />}>
          {latest.length === 0 && <p className="text-sm text-neutral-500">No feedback yet.</p>}
          <ul className="space-y-3">
            {latest.map((f) => (
              <li key={f.id} className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
                <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
                  <span className="font-semibold capitalize">{f.kind}</span>
                  {f.rating ? <span className="text-amber-500">{"★".repeat(f.rating)}</span> : <span>{ago(f.created_at)}</span>}
                </div>
                {f.message && <p className="mt-1 line-clamp-3 text-sm">{f.message}</p>}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}

function MoreLink({ href }) {
  return (
    <Link href={href} className="flex items-center text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
      See all <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function PeopleList({ users, empty, right }) {
  if (!users.length) return <p className="text-sm text-neutral-500">{empty}</p>;
  return (
    <ul className="-mx-2">
      {users.map((u) => (
        <li key={u.user_id}>
          <Link href={`/admin/users/${u.user_id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
            <Avatar user={u} size="h-8 w-8 text-xs" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium break-words">{userName(u)}</span>
              <span className="block text-xs break-all text-neutral-500">{u.email}</span>
            </span>
            {right(u)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

