import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Finds a YouTube "how to make it" video for a dish. Cached per dish in public.recipe_videos,
// so the YouTube API (YOUTUBE_API_KEY, ~100 searches/day free) is hit once per dish ever.
const clean = (s) => String(s ?? "").replace(/^(pre|post)[- ]?workout\s*[-:–]\s*/i, "").replace(/\s+/g, " ").trim().slice(0, 120);

export async function GET(request) {
  const dish = clean(new URL(request.url).searchParams.get("dish"));
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
    const q = new URLSearchParams({ part: "snippet", type: "video", videoEmbeddable: "true", safeSearch: "strict", maxResults: "1", q: `${dish} recipe easy`, key: apiKey });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${q}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return Response.json({ videoId: null, reason: "search-failed" });
    const json = await res.json();
    const item = json.items?.[0];
    const videoId = item?.id?.videoId ?? null;
    if (admin) await admin.from("recipe_videos").upsert({ dish_key: key, video_id: videoId, title: item?.snippet?.title ?? null }, { onConflict: "dish_key" });
    return Response.json({ videoId }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return Response.json({ videoId: null, reason: "search-failed" });
  }
}
