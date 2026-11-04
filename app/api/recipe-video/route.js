import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Finds a YouTube "how to make it" video for a dish. Cached per dish in public.recipe_videos,
// so the YouTube API (YOUTUBE_API_KEY, ~100 searches/day free) is hit once per dish ever.
// Accuracy: the query uses only the dish (no "post-workout", "high protein", notes), and the
// chosen video's title must contain most of the dish's words; otherwise no video (search link).

const NOISE = /\b(pre|post)[\s-]*workout\b|\b(rest|training|recovery|cheat)[\s-]*day\b|\bmeal\b|\bcombo\b|\bpower\b|\bhigh[\s-]*protein\b|\bprotein[\s-]*rich\b|\bhealthy\b|\bquick\b|\beasy\b/gi;
const STOP = new Set(["with", "and", "the", "for", "of", "in", "on", "a", "an", "style", "bowl", "plate", "serving"]);

const words = (t) =>
  String(t)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

// Sides that don't need a video ("Paneer dal roti" -> cook "paneer dal").
const SIDES = /\b(roti|rotis|chapati|chapatis|phulka|naan|rice|jeera rice|curd|dahi|raita|salad|papad|pickle|buttermilk|chaas)\b/gi;

function cleanDish(name) {
  let t = String(name ?? "")
    .replace(/\([^)]*\)/g, " ") // bracketed notes
    .replace(NOISE, " ");
  // Main dish = the part before "with"/"and"/"+".
  t = t.split(/\s+(?:with|and|\+|&)\s+|,/i)[0];
  const withoutSides = t.replace(SIDES, " ").replace(/\s+/g, " ").trim();
  if (words(withoutSides).length >= 1) t = withoutSides;
  return t.replace(/[-:–|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}


// Share of the dish's key words found in the video title (handles plurals: roti/rotis).
function score(dishWords, title) {
  const t = new Set(words(title).map((w) => w.replace(/s$/, "")));
  const hits = dishWords.filter((w) => t.has(w.replace(/s$/, ""))).length;
  return dishWords.length ? hits / dishWords.length : 0;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const dish = params.get("q")?.trim() ? params.get("q").replace(NOISE, " ").replace(/\s+/g, " ").trim().slice(0, 120) : cleanDish(params.get("dish"));
  if (dish.length < 2) return Response.json({ videoId: null });
  const key = dish.toLowerCase();
  const admin = getSupabaseAdmin();

  if (admin) {
    const { data } = await admin.from("recipe_videos").select("video_id").eq("dish_key", key).maybeSingle();
    if (data) return Response.json({ videoId: data.video_id }, { headers: { "Cache-Control": "public, max-age=86400" } });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return Response.json({ videoId: null, reason: "not-configured" });

  try {
    const q = new URLSearchParams({ part: "snippet", type: "video", videoEmbeddable: "true", safeSearch: "strict", maxResults: "8", q: `${dish} recipe`, key: apiKey });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${q}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return Response.json({ videoId: null, reason: "search-failed" });
    const json = await res.json();
    const dishWords = words(dish);
    // Best title match first; keep YouTube's order on ties.
    const ranked = (json.items ?? [])
      .map((it, i) => ({ it, i, s: score(dishWords, it.snippet?.title ?? "") }))
      .sort((a, b) => b.s - a.s || a.i - b.i);
    const best = ranked[0];
    const videoId = best && best.s >= 0.67 ? best.it.id?.videoId ?? null : null;
    if (admin) await admin.from("recipe_videos").upsert({ dish_key: key, video_id: videoId, title: videoId ? best.it.snippet?.title ?? null : null }, { onConflict: "dish_key" });
    return Response.json({ videoId }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return Response.json({ videoId: null, reason: "search-failed" });
  }
}
