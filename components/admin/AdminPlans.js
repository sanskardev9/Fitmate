"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dumbbell, Utensils, Search, ChevronRight } from "lucide-react";
import { useAdminData } from "./AdminShell";
import { card, fullDate, userName, Avatar, PageTitle, Skeleton } from "./ui";

// Every plan across all users, newest first.
export default function AdminPlans() {
  const { users } = useAdminData();
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const all = useMemo(() => (users ?? []).flatMap((u) => u.plans.map((p) => ({ ...p, owner: u }))).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), [users]);
  const list = all.filter((p) => (kind === "all" || p.kind === kind) && (showArchived || !p.archived) && `${p.name} ${userName(p.owner)} ${p.owner.email}`.toLowerCase().includes(q.trim().toLowerCase()));
  const count = (k) => all.filter((p) => !p.archived && (k === "all" || p.kind === k)).length;

  return (
    <>
      <PageTitle title="Plans" sub="Every workout and diet plan people are following" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plan or person" className="h-11 w-full rounded-xl border border-neutral-200 bg-white pr-3 pl-9 text-sm outline-none focus:border-emerald-500 dark:border-neutral-800 dark:bg-neutral-900" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
            {[
              ["all", "All"],
              ["workout", "Workout"],
              ["diet", "Diet"],
            ].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setKind(v)} className={`h-8 rounded-lg px-3 text-xs font-semibold ${kind === v ? "bg-white shadow-sm dark:bg-neutral-800" : "text-neutral-500"}`}>
                {l} <span className="text-neutral-400 tabular-nums">{users ? count(v) : ""}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowArchived((x) => !x)} className={`h-10 rounded-xl border px-3 text-xs font-semibold ${showArchived ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"}`}>
            Show archived
          </button>
        </div>
      </div>

      {!users ? (
        <Skeleton className="mt-4 h-80" />
      ) : (
        <ul className={`${card} mt-4 divide-y divide-neutral-100 overflow-hidden dark:divide-neutral-800`}>
          {list.map((p) => (
            <li key={`${p.owner.user_id}-${p.id}`}>
              <Link href={`/admin/users/${p.owner.user_id}/plans/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.kind === "workout" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                  {p.kind === "workout" ? <Dumbbell className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold break-words">{p.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <Avatar user={p.owner} size="h-4 w-4 text-[9px]" />
                      {userName(p.owner)}
                    </span>
                    {p.createdAt && <span>· {fullDate(p.createdAt)}</span>}
                    {p.archived && <span className="rounded-full bg-neutral-100 px-1.5 dark:bg-neutral-800">archived</span>}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
              </Link>
            </li>
          ))}
          {list.length === 0 && <li className="p-8 text-center text-sm text-neutral-500">No plans match.</li>}
        </ul>
      )}
    </>
  );
}
