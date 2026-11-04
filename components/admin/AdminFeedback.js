"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Globe, MessageSquare, Inbox, Check } from "lucide-react";
import { useAdminData, adminApi } from "./AdminShell";
import { card, ago, PageTitle, Stat, Skeleton } from "./ui";

const KINDS = ["all", "new", "review", "idea", "bug", "other"];
const KIND_TONE = {
  review: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  idea: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  bug: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  other: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
};

export default function AdminFeedback() {
  const { feedback, setFeedback, users } = useAdminData();
  const [filter, setFilter] = useState("all");

  if (!feedback) {
    return (
      <>
        <PageTitle title="Feedback" sub="Ratings, ideas and bug reports" />
        <Skeleton className="h-80" />
      </>
    );
  }

  const rated = feedback.filter((f) => f.rating);
  const avg = rated.length ? (rated.reduce((n, f) => n + f.rating, 0) / rated.length).toFixed(1) : "–";
  const list = feedback.filter((f) => filter === "all" || f.kind === filter || (filter === "new" && f.status === "new"));
  const byEmail = Object.fromEntries((users ?? []).map((u) => [u.email, u.user_id]));
  const dist = [5, 4, 3, 2, 1].map((n) => [n, rated.filter((f) => f.rating === n).length]);

  async function update(f, changes) {
    setFeedback((all) => all.map((x) => (x.id === f.id ? { ...x, ...changes } : x)));
    try {
      await adminApi("/api/admin/feedback", { method: "PATCH", body: JSON.stringify({ id: f.id, ...changes }) });
    } catch {
      setFeedback((all) => all.map((x) => (x.id === f.id ? f : x)));
    }
  }

  return (
    <>
      <PageTitle title="Feedback" sub="Ratings, ideas and bug reports" />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Average rating" value={avg === "–" ? "–" : `${avg} ★`} hint={`${rated.length} ratings`} Icon={Star} tone="amber" />
          <Stat label="New" value={feedback.filter((f) => f.status === "new").length} hint="Not read yet" Icon={Inbox} />
          <Stat label="Total" value={feedback.length} Icon={MessageSquare} tone="sky" />
          <Stat label="On website" value={feedback.filter((f) => f.is_public).length} hint="Shown as reviews" Icon={Globe} tone="violet" />
        </div>
        <div className={`${card} p-4`}>
          <p className="text-xs font-medium text-neutral-500">Ratings</p>
          <ul className="mt-2 space-y-1.5">
            {dist.map(([n, c]) => (
              <li key={n} className="flex items-center gap-2 text-xs tabular-nums">
                <span className="w-6 text-neutral-500">{n} ★</span>
                <span className="h-2 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <span className="block h-2 rounded-full bg-amber-400" style={{ width: `${rated.length ? (c / rated.length) * 100 : 0}%` }} />
                </span>
                <span className="w-5 text-right font-semibold">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {KINDS.map((k) => {
          const n = k === "all" ? feedback.length : k === "new" ? feedback.filter((f) => f.status === "new").length : feedback.filter((f) => f.kind === k).length;
          return (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold capitalize ${filter === k ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"}`}>
              {k} <span className="text-neutral-400 tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {list.map((f) => (
          <article key={f.id} className={`${card} relative flex flex-col p-4 ${f.status === "new" ? "ring-1 ring-emerald-500/40" : ""}`}>
            {f.status === "new" && <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500" aria-label="New" />}
            <div className="flex flex-wrap items-center gap-2 pr-4">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${KIND_TONE[f.kind] ?? KIND_TONE.other}`}>{f.kind}</span>
              {f.rating ? (
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-3.5 w-3.5 ${n <= f.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-600"}`} />
                  ))}
                </span>
              ) : null}
              <span className="text-xs text-neutral-500">{ago(f.created_at)}</span>
            </div>
            {f.message ? <p className="mt-2 flex-1 text-sm whitespace-pre-line">{f.message}</p> : <p className="mt-2 flex-1 text-sm text-neutral-400">No message, rating only.</p>}
            <p className="mt-3 text-xs text-neutral-500">
              {byEmail[f.email] ? (
                <Link href={`/admin/users/${byEmail[f.email]}`} className="font-semibold text-neutral-700 hover:underline dark:text-neutral-300">
                  {f.name || f.email}
                </Link>
              ) : (
                <span className="font-semibold">{f.name || "No name"}</span>
              )}{" "}
              · <span className="break-all">{f.email}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              {f.status === "new" ? (
                <button type="button" onClick={() => update(f, { status: "read" })} className="flex h-8 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">
                  <Check className="h-3.5 w-3.5" /> Mark read
                </button>
              ) : (
                <button type="button" onClick={() => update(f, { status: f.status === "done" ? "read" : "done" })} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${f.status === "done" ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}>
                  <Check className="h-3.5 w-3.5" /> {f.status === "done" ? "Done" : "Mark done"}
                </button>
              )}
              {f.kind === "review" && f.allow_public && (
                <button type="button" onClick={() => update(f, { is_public: !f.is_public })} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${f.is_public ? "bg-emerald-600 text-white" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
                  <Globe className="h-3.5 w-3.5" /> {f.is_public ? "On website" : "Show on website"}
                </button>
              )}
            </div>
          </article>
        ))}
        {list.length === 0 && <p className={`${card} p-8 text-center text-sm text-neutral-500 lg:col-span-2`}>No feedback here yet.</p>}
      </div>
    </>
  );
}
