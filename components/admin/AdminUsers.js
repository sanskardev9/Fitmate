"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Flame, Dumbbell, Utensils, ClipboardList, ChevronRight, Trash2 } from "lucide-react";
import { useDeleteUser } from "./useDeleteUser";
import { useAdminData } from "./AdminShell";
import { card, GOAL, ago, userName, activeWithin, Avatar, PageTitle, Skeleton } from "./ui";

const FILTERS = [
  ["all", "All", () => true],
  ["active", "Active this week", (u) => activeWithin(u, 7)],
  ["streak", "On a streak", (u) => u.streak > 0],
  ["noplan", "No plan", (u) => !u.plans.some((p) => !p.archived)],
  ["setup", "Setup not done", (u) => !u.onboarded_at],
];
const SORTS = [
  ["recent", "Newest", (a, b) => new Date(b.created_at) - new Date(a.created_at)],
  ["active", "Last active", (a, b) => new Date(b.last_sync ?? 0) - new Date(a.last_sync ?? 0)],
  ["streak", "Streak", (a, b) => b.streak - a.streak || b.active_last_14 - a.active_last_14],
  ["workouts", "Workouts", (a, b) => b.workouts - a.workouts],
];

export default function AdminUsers() {
  const { users } = useAdminData();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const del = useDeleteUser();

  const list = useMemo(() => {
    const f = FILTERS.find((x) => x[0] === filter)[2];
    const s = SORTS.find((x) => x[0] === sort)[2];
    const needle = q.trim().toLowerCase();
    return (users ?? []).filter((u) => f(u) && `${u.email} ${u.full_name ?? ""}`.toLowerCase().includes(needle)).sort(s);
  }, [users, q, filter, sort]);

  return (
    <>
      <PageTitle title="Users" sub={users ? `${users.length} people have signed up` : "Loading"} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="h-11 w-full rounded-xl border border-neutral-200 bg-white pr-3 pl-9 text-sm outline-none focus:border-emerald-500 dark:border-neutral-800 dark:bg-neutral-900" />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
          {SORTS.map(([v, l]) => (
            <button key={v} type="button" onClick={() => setSort(v)} className={`h-8 rounded-lg px-3 text-xs font-semibold ${sort === v ? "bg-white shadow-sm dark:bg-neutral-800" : "text-neutral-500"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map(([v, l, f]) => (
          <button key={v} type="button" onClick={() => setFilter(v)} className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${filter === v ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"}`}>
            {l}
            {users && <span className="text-neutral-400 tabular-nums">{users.filter(f).length}</span>}
          </button>
        ))}
      </div>

      {del.error && <p className="mt-3 rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-300">{del.error}</p>}

      {!users ? (
        <Skeleton className="mt-4 h-80" />
      ) : (
        <div className={`${card} mt-4 overflow-hidden`}>
          <div className="hidden items-center gap-4 border-b border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-500 lg:flex dark:border-neutral-800">
            <span className="flex-1">User</span>
            <span className="w-36">Goal</span>
            <span className="w-24">Last active</span>
            <span className="w-14 text-center">Streak</span>
            <span className="w-10" />
          </div>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {list.map((u) => {
              const self = !del.canDelete(u);
              return (
                <li key={u.user_id} className={`group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-neutral-50 lg:gap-4 dark:hover:bg-neutral-800/40 ${del.busyId === u.user_id ? "pointer-events-none opacity-40" : ""}`}>
                  <Link href={`/admin/users/${u.user_id}`} className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
                    <Avatar user={u} size="h-11 w-11 text-base" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold break-words group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{userName(u)}</span>
                        {self && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase dark:text-emerald-300">You</span>}
                        {!u.onboarded_at && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">Setup not done</span>}
                      </span>
                      <span className="block text-sm break-all text-neutral-500">{u.email}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs tabular-nums">
                        <span className="sm:hidden"><Streak n={u.streak} small /></span>
                        <Meta Icon={Dumbbell} value={u.workouts} label="Workouts finished" />
                        <Meta Icon={Utensils} value={u.meal_logs} label="Meals logged" />
                        <Meta Icon={ClipboardList} value={u.plans.filter((p) => !p.archived).length} label="Plans" />
                        <span className="text-neutral-500 lg:hidden">active {ago(u.last_sync)}</span>
                      </span>
                    </span>
                    <span className="hidden w-36 text-sm lg:block">{GOAL[u.goal] ?? <span className="text-neutral-400">–</span>}</span>
                    <span className="hidden w-24 text-sm text-neutral-500 lg:block">{ago(u.last_sync)}</span>
                    <span className="hidden w-14 justify-center sm:flex">
                      <Streak n={u.streak} />
                    </span>
                  </Link>
                  {self ? (
                    <ChevronRight className="mx-3 h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
                  ) : (
                    <button type="button" onClick={() => del.remove(u)} aria-label={`Delete ${userName(u)}`} title="Delete user" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-rose-500/10 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:outline-none">
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {list.length === 0 && <p className="p-8 text-center text-sm text-neutral-500">No users match.</p>}
        </div>
      )}
    </>
  );
}

function Streak({ n, small = false }) {
  return (
    <span title={`${n}-day streak`} className={`inline-flex ${small ? "h-6 gap-0.5 px-1.5 text-xs" : "h-8 min-w-14 gap-1 px-2.5 text-sm"} shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${n ? "bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/25 dark:text-orange-400" : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"}`}>
      <Flame className={small ? "h-3.5 w-3.5" : "h-4 w-4"} /> {n}
    </span>
  );
}

function Meta({ Icon, value, label }) {
  return (
    <span title={label} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
      <Icon className="h-3.5 w-3.5 text-neutral-400" />
      {value}
    </span>
  );
}
