// Single place to read public env vars. NEXT_PUBLIC_* values are inlined at build time, so they
// must be referenced literally (process.env.NEXT_PUBLIC_X), not via dynamic keys.
export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  // Legacy anon keys are still accepted under the old name.
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabasePublishableKey);
