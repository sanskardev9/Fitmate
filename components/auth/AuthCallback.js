"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { primaryButton } from "@/components/common/ui";

// Landing page for email links. supabase-js exchanges the ?code= itself on load
// (detectSessionInUrl); getSession() waits for that, then we continue to `next`.
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const next = params.get("next")?.startsWith("/") ? params.get("next") : "/home";
    const linkError = params.get("error_description") || hash.get("error_description");
    if (linkError) return setError(linkError);
    if (!supabase) return setError("Accounts aren't configured in this copy of FitMate.");

    supabase.auth.getSession().then(({ data, error }) => {
      if (data.session) router.replace(next);
      else setError(error?.message || "This link is invalid or has expired. Links work once, in the browser where you requested them.");
    });
  }, [router]);

  if (error) {
    return (
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight">Link didn&apos;t work</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">{error}</p>
        <Link href="/login" className={`${primaryButton} mt-6 block text-center`}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
      <p className="text-neutral-500">Signing you in…</p>
    </div>
  );
}
