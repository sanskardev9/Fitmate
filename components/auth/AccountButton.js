"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, displayName } from "./AuthProvider";
import { useSyncState } from "@/components/sync/SyncProvider";

export function SyncStatus() {
  const { status, lastSyncedAt } = useSyncState();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  const ago = lastSyncedAt ? Math.round((Date.now() - lastSyncedAt) / 60000) : null;
  const text =
    status === "syncing" ? "Syncing…" : status === "offline" ? "Offline · will sync later" : status === "error" ? "Sync failed · retrying" : ago == null ? "Not synced yet" : ago < 1 ? "Synced just now" : `Synced ${ago} min ago`;
  const dot = status === "error" ? "bg-red-500" : status === "offline" ? "bg-amber-500" : status === "syncing" ? "bg-sky-500 animate-pulse" : "bg-emerald-500";
  return (
    <span className="flex items-center gap-1.5 text-xs text-neutral-500">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {text}
    </span>
  );
}

// Sign-in link when signed out; avatar with a small menu when signed in.
export default function AccountButton({ variant = "sidebar" }) {
  const { user, loading, enabled } = useAuth();

  if (!enabled || loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className={
          variant === "sidebar"
            ? "flex items-center justify-center gap-2 rounded-xl border border-neutral-300 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            : "rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
        }
      >
        Sign in
      </Link>
    );
  }

  const name = displayName(user);
  const initial = name.charAt(0).toUpperCase();

  // Avatar opens the profile page (details, edit, sign out).
  return (
    <Link
      href="/profile"
      aria-label="Your profile"
      className={variant === "sidebar" ? "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900" : "flex items-center rounded-full transition-transform active:scale-95"}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">{initial}</span>
      {variant === "sidebar" && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{name}</span>
          <SyncStatus />
        </span>
      )}
    </Link>
  );
}
