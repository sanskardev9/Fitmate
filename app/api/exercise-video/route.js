import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Finds a short "how to do it" YouTube video for an exercise. Cached per exercise forever
// (public.recipe_videos, key "ex:<name>"), so each exercise costs one YouTube search, once.
// The chosen video's title must contain most of the exercise's key words, else no video.

const STOP = new Set(["with", "and", "the", "for", "of", "in", "on", "to", "a", "an", "each", "side", "sec", "hold", "reps", "set", "sets"]);
const words = (t) =>
  String(t)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

// "Band-Resisted Bulgarian Split Squat (each leg)" -> "Band Resisted Bulgarian Split Squat"
const clean = (name) =>
  String(name ?? "")
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+[-–|:]\s+/)[0]
    .replace(/[-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

function score(keys, title) {
  const t = new Set(words(title).map((w) => w.replace(/s$/, "")));
  const hits = keys.filter((w) => t.has(w.replace(/s$/, ""))).length;
  return keys.length ? hits / keys.length : 0;
}

export async function GET(request) {
  const name = clean(new URL(request.url).searchParams.get("name"));
  if (name.length < 3) return Response.json({ videoId: null });
  const key = `ex:${name.toLowerCase()}`;
  const admin = getSupabaseAdmin();
  const cacheHeaders = { headers: { "Cache-Control": "public, max-age=86400" } };

  if (admin) {
    const { data } = await admin.from("recipe_videos").select("video_id").eq("dish_key", key).maybeSingle();
    if (data) return Response.json({ videoId: data.video_id }, cacheHeaders);
  }
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return Response.json({ videoId: null, reason: "not-configured" });

  try {
    const q = new URLSearchParams({ part: "snippet", type: "video", videoEmbeddable: "true", safeSearch: "strict", videoDuration: "short", maxResults: "8", q: `${name} exercise how to proper form`, key: apiKey });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${q}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return Response.json({ videoId: null, reason: "search-failed" });
    const json = await res.json();
    const keys = words(name);
    const best = (json.items ?? [])
      .map((it, i) => ({ it, i, s: score(keys, it.snippet?.title ?? "") }))
      .sort((a, b) => b.s - a.s || a.i - b.i)[0];
    // Exercise names vary a lot ("Tuck Human Flag Hold - Band Assisted"): half the key words is enough.
    const videoId = best && best.s >= 0.5 ? best.it.id?.videoId ?? null : null;
    if (admin) await admin.from("recipe_videos").upsert({ dish_key: key, video_id: videoId, title: videoId ? best.it.snippet?.title ?? null : null }, { onConflict: "dish_key" });
    return Response.json({ videoId }, cacheHeaders);
  } catch {
    return Response.json({ videoId: null, reason: "search-failed" });
  }
}
