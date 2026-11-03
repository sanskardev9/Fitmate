import { createClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "@/lib/env";

// Optional cloud layer. FitMate stays local-first: every core feature works without this,
// so callers must handle `supabase === null` (not configured) and being offline.
// PKCE: email links come back as ?code=… and are exchanged on /auth/callback in the same browser.
export const supabase = hasSupabase
  ? createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const isCloudEnabled = () => supabase !== null;

// Where email links (confirm, magic link, password reset) send the user back to.
export const authRedirect = (next = "/home") => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
