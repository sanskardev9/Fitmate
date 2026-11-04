import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Search suggestions while typing: searches FitMate users already made (instant, cached results) first,
// then YouTube's own autocomplete. Free: autocomplete doesn't use the YouTube API quota.
export async function GET(request) {
  const q = String(new URL(request.url).searchParams.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ suggestions: [] });
  const headers = { "Cache-Control": "public, max-age=3600" };

  const [ours, youtube] = await Promise.all([
    (async () => {
      const admin = getSupabaseAdmin();
      if (!admin) return [];
      const { data } = await admin.from("yt_search_cache").select("query_key").ilike("query_key", `%${q.toLowerCase().replace(/[%_]/g, "")}%`).limit(3);
      return (data ?? []).map((r) => r.query_key);
    })().catch(() => []),
    fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(2500) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (Array.isArray(j?.[1]) ? j[1] : []))
      .catch(() => []),
  ]);

  const seen = new Set();
  const suggestions = [...ours, ...youtube]
    .map((s) => String(s).trim())
    .filter((s) => s && s.toLowerCase() !== q.toLowerCase() && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .slice(0, 7);
  return Response.json({ suggestions }, { headers });
}
