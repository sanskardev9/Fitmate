"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { onLocalChange } from "@/lib/db/dexie";
import { syncNow, subscribeSync, getSyncState } from "@/lib/sync/sync";

// Background check for changes from your other devices: every 5 min, only while the tab is visible.
const INTERVAL_MS = 5 * 60_000;
// Coming back to the tab only re-checks if the last sync is older than this.
const STALE_MS = 60_000;
const DEBOUNCE_MS = 1500;

// Keeps local data and the signed-in account in step: on sign-in, shortly after any local
// change (the main trigger), when the tab comes back after a while, when the network returns,
// and a light background check every 5 minutes while the app is on screen.
export default function SyncProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let debounce;
    const run = () => syncNow(userId);
    const soon = () => {
      clearTimeout(debounce);
      debounce = setTimeout(run, DEBOUNCE_MS);
    };
    const stale = () => Date.now() - (getSyncState().lastSyncedAt ?? 0) > STALE_MS;
    const onVisible = () => document.visibilityState === "visible" && stale() && run();
    const tick = () => document.visibilityState === "visible" && run();

    run();
    const interval = setInterval(tick, INTERVAL_MS);
    const offChange = onLocalChange(soon);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      clearTimeout(debounce);
      offChange();
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  return children;
}

export const useSyncState = () => useSyncExternalStore(subscribeSync, getSyncState, getSyncState);
