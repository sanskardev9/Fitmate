"use client";

import { useEffect, useState } from "react";
import { Play, Search } from "lucide-react";
import { youtubeId, youtubeSearchUrl } from "@/lib/youtube";

// Recipe video: the plan's own link if it has one, otherwise FitMate finds one (server, cached per dish).
// Shows a thumbnail first (no data used) and plays inline on tap. Nothing found -> a YouTube search link.
export default function RecipeVideo({ url, dish, search }) {
  const own = youtubeId(url);
  const [found, setFound] = useState(own ? { id: own } : null); // null = looking, {id:null} = none
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (own) return setFound({ id: own });
    let cancelled = false;
    setFound(null);
    fetch(`/api/recipe-video?v=3&dish=${encodeURIComponent(dish)}${search ? `&q=${encodeURIComponent(search)}` : ""}`)
      .then((r) => r.json())
      .then((j) => !cancelled && setFound({ id: j.videoId ?? null }))
      .catch(() => !cancelled && setFound({ id: null }));
    return () => {
      cancelled = true;
    };
  }, [own, dish, search]);

  if (!found) return <div className="aspect-video w-full animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />;

  if (!found.id) {
    return (
      <a href={youtubeSearchUrl(search || dish)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
        <Search className="h-3.5 w-3.5" /> Find recipe videos
      </a>
    );
  }

  const id = found.id;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={`How to make ${dish}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={`Play recipe video for ${dish}`} className="group absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100" loading="lazy" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-xl transition-transform group-active:scale-95">
              <Play className="ml-1 h-6 w-6 fill-current" />
            </span>
          </span>
          <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white">How to make it</span>
        </button>
      )}
    </div>
  );
}
