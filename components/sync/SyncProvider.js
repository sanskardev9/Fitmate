"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { onLocalChange } from "@/lib/db/dexie";
import { syncNow, subscribeSync, getSyncState } from "@/lib/sync/sync";

const INTERVAL_MS = 20_000;
const DEBOUNCE_MS = 1500;

// Keeps local data and the signed-in account in step: on sign-in, shortly after any local
// change, when the tab regains focus or the network returns, and every 20 s.
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
    const onVisible = () => document.visibilityState === "visible" && run();

    run();
    const interval = setInterval(run, INTERVAL_MS);
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
