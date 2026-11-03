// YouTube helpers for recipe videos.

// Video id from any common YouTube URL (watch, youtu.be, shorts, embed). null if not a video link.
export function youtubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(String(url).trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else id = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const youtubeSearchUrl = (dish) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${dish} recipe easy`)}`;

// Asks our server which links point to real videos (YouTube oEmbed). Returns a Set of valid ids.
export async function checkVideos(urls) {
  const ids = [...new Set(urls.map(youtubeId).filter(Boolean))];
  if (!ids.length) return new Set();
  try {
    const res = await fetch("/api/youtube-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    const { valid } = await res.json();
    return new Set(valid ?? []);
  } catch {
    return new Set(ids); // offline: keep them, the player shows YouTube's own error if one is wrong
  }
}
