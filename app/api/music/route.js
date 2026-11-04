import { requireUser } from "@/lib/server/userAuth";

// Workout music search (YouTube, music category). Signed-in users only. Results are cached for a day
// per query, and new searches are capped per day so the free YouTube quota (~100 searches) lasts.
const DAILY_NEW_SEARCHES = 70;
const TTL_MS = 24 * 3600 * 1000;

export async function GET(request) {
  const { admin, error } = await requireUser(request);
  if (error) return error;
  const raw = String(new URL(request.url).searchParams.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (raw.length < 2) return Response.json({ results: [] });
  // v2: results are limited to songs playable outside YouTube (older cached lists had blocked ones).
  const key = `v2:${raw.toLowerCase()}`;

  const { data: hit } = await admin.from("yt_search_cache").select("results, fetched_at").eq("query_key", key).maybeSingle();
  if (hit && Date.now() - new Date(hit.fetched_at) < TTL_MS) return Response.json({ results: hit.results, cached: true });

  const since = new Date(Date.now() - TTL_MS).toISOString();
  const { count } = await admin.from("yt_search_cache").select("query_key", { count: "exact", head: true }).gte("fetched_at", since);
  if ((count ?? 0) >= DAILY_NEW_SEARCHES) {
    if (hit) return Response.json({ results: hit.results, cached: true });
    return Response.json({ error: "Search is busy today. Try one of the quick picks." }, { status: 429 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return Response.json({ error: "Music search isn't set up." }, { status: 503 });
  try {
    const q = new URLSearchParams({ part: "snippet", type: "video", videoEmbeddable: "true", videoSyndicated: "true", videoCategoryId: "10", safeSearch: "moderate", maxResults: "15", q: raw, key: apiKey });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${q}`, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return Response.json({ error: "Couldn't search right now." }, { status: 502 });
    const json = await res.json();
    const decode = (s) => String(s ?? "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const results = (json.items ?? [])
      .filter((it) => it.id?.videoId)
      .map((it) => ({ id: it.id.videoId, title: decode(it.snippet?.title), channel: decode(it.snippet?.channelTitle) }));
    await admin.from("yt_search_cache").upsert({ query_key: key, results, fetched_at: new Date().toISOString() }, { onConflict: "query_key" });
    return Response.json({ results });
  } catch {
    return Response.json({ error: "Couldn't search right now." }, { status: 502 });
  }
}
