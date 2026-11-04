"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const card = "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";

export const GOAL = {
  lose_fat: "Lose fat",
  recomposition: "Recomposition",
  build_muscle: "Build muscle",
  gain_strength: "Get stronger",
  calisthenics_skills: "Calisthenics",
  general_fitness: "General fitness",
  maintain: "Maintain",
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Dates are compared as YYYY-MM-DD in India time, same as the activity view.
export const dayKey = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const lastDays = (n) => Array.from({ length: n }, (_, i) => dayKey(new Date(Date.now() - (n - 1 - i) * 86400000)));
export const shortDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export const fullDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const ago = (t) => {
  if (!t) return "never";
  const m = Math.round((Date.now() - new Date(t)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  if (m < 43200) return `${Math.round(m / 1440)}d ago`;
  return fullDate(t);
};

export const userName = (u) => u.full_name || u.email?.split("@")[0] || "Unknown";
export const activeWithin = (u, days) => {
  const keep = new Set(lastDays(days));
  return (u.active_days ?? []).some((d) => keep.has(String(d)));
};

export function Avatar({ user, size = "h-10 w-10 text-sm" }) {
  const hue = [...(user.user_id ?? "x")].reduce((n, c) => n + c.charCodeAt(0), 0) % 4;
  const tone = ["bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-amber-600"][hue];
  return <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${tone} ${size}`}>{userName(user).charAt(0).toUpperCase()}</span>;
}

export function PageTitle({ title, sub, back, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
            <ChevronLeft className="h-4 w-4" /> {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-neutral-500">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, Icon, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export function Section({ title, sub, action, children, className = "" }) {
  return (
    <section className={`${card} p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {sub && <p className="text-xs text-neutral-500">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Skeleton({ className = "h-24" }) {
  return <div className={`animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900 ${className}`} />;
}

// Single-series column chart with a hover/tap tooltip per column.
export function ColumnChart({ data, height = "h-40", unit = "" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  return (
    <div>
      <div className="relative">
        <span className="absolute -top-1 left-0 text-[11px] text-neutral-400 tabular-nums">{max}</span>
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-neutral-200 dark:border-neutral-800" />
        <div className={`flex items-end gap-[2px] border-b border-neutral-200 pt-4 dark:border-neutral-800 ${height}`}>
          {data.map((d, i) => {
            const pos = i < n * 0.2 ? "left-0" : i > n * 0.8 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <div key={d.label} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none" aria-label={`${d.label}: ${d.value}${unit}`}>
                <div
                  className={`w-full rounded-t-[4px] transition-colors ${d.value ? "bg-emerald-500 group-hover:bg-emerald-600 group-focus:bg-emerald-600 dark:bg-emerald-500/90 dark:group-hover:bg-emerald-400" : "bg-neutral-200 dark:bg-neutral-800"}`}
                  style={{ height: d.value ? `${(d.value / max) * 100}%` : "2px", minHeight: d.value ? 4 : 2 }}
                />
                <span className={`pointer-events-none absolute bottom-full z-10 mb-1.5 hidden rounded-lg bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg group-hover:block group-focus:block dark:bg-white dark:text-neutral-900 ${pos}`}>
                  <span className="font-semibold tabular-nums">
                    {d.value}
                    {unit}
                  </span>{" "}
                  · {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-neutral-400">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(n / 2)]?.label}</span>
        <span>{data[n - 1]?.label}</span>
      </div>
    </div>
  );
}

// Horizontal bars for a ranked list (label, count, optional % of a total).
export function BarList({ rows, total }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 break-words">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {r.value}
              {total ? <span className="ml-1.5 text-xs font-normal text-neutral-500">{Math.round((r.value / Math.max(1, total)) * 100)}%</span> : null}
            </span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div className="h-2 rounded-full bg-emerald-500 transition-[width] duration-700" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
