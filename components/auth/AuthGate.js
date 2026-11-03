"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { cachedProfile, fetchProfile, clearProfileCache } from "@/lib/services/profileService";
import { LogoMark } from "@/components/common/Logo";

let profileCheck = null;
const SETUP_PATHS = ["/plans/workout/new", "/plans/diet/new"];

// Protects app pages: signed-out visitors go to /login, signed-in users who haven't finished
// setup go to /onboarding. Uses the cached profile first so the app still opens offline.
export default function AuthGate({ children, requireOnboarded = true }) {
  const { user, loading, enabled } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    if (!enabled) return setStatus("ok"); // no Supabase configured: local-only mode
    if (loading) return;
    if (!user) {
      // Signed out (by choice or an expired session): always the website, never the login form.
      router.replace("/");
      return;
    }
    sessionStorage.removeItem("fitmate:signed-out");
    // Plan builders are part of setup, so they open before onboarding is finished.
    if (!requireOnboarded || SETUP_PATHS.includes(pathname)) return setStatus("ok");

    const local = cachedProfile(user.id);
    if (local?.onboarded_at) setStatus("ok");

    let cancelled = false;
    // Fetch the profile once per app load, not on every page change.
    if (!profileCheck || profileCheck.userId !== user.id) profileCheck = { userId: user.id, promise: fetchProfile(user.id) };
    profileCheck.promise
      .then((profile) => {
        if (cancelled) return;
        // No profile on the server (new account or the row was deleted): drop the stale cache and set up again.
        if (profile === null) {
          clearProfileCache(user.id);
          profileCheck = null;
          return router.replace("/onboarding");
        }
        // The cache is updated on save, so it wins over a fetch made before onboarding finished.
        if (profile?.onboarded_at || cachedProfile(user.id)?.onboarded_at) setStatus("ok");
        else router.replace("/onboarding");
      })
      .catch(() => {
        // Offline or Supabase unreachable: trust the cache, otherwise let them in rather than lock out.
        if (!cancelled && !local) setStatus("ok");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, loading, user, pathname, router, requireOnboarded]);

  if (status !== "ok") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LogoMark className="h-12 w-12 animate-pulse" />
      </div>
    );
  }
  return children;
}
