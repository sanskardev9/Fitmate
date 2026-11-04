"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, SkipForward, SkipBack, ListMusic } from "lucide-react";
import { useMusic, stopMusic, nextTrack, prevTrack, openMusic } from "@/lib/music";

// Floating player that keeps playing across pages. It's YouTube's own player (free; YouTube's
// rules require the video to stay visible). The rest of the list plays automatically after it.
export default function MiniPlayer() {
  const { queue, index } = useMusic();
  const pathname = usePathname();
  const track = queue[index];
  // While playing, pages get extra room at the bottom so the player never hides content.
  useEffect(() => {
    document.documentElement.classList.toggle("music-on", Boolean(track));
    return () => document.documentElement.classList.remove("music-on");
  }, [track]);
  if (!track) return null;

  const rest = queue.slice(index + 1, index + 30).map((t) => t.id).join(",");
  const src = `https://www.youtube-nocookie.com/embed/${track.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1${rest ? `&playlist=${rest}` : ""}`;
  // During a workout the bottom of the screen is busy (next set, rest timer): sit at the top there.
  const inSession = pathname?.startsWith("/session");
  const place = inSession ? "top-[calc(env(safe-area-inset-top)+4.5rem)]" : "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-4";

  return (
    <div className={`fixed right-3 z-[75] w-[min(15rem,calc(100vw-1.5rem))] md:w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl md:right-4 dark:border-neutral-800 dark:bg-neutral-900 ${place}`}>
      <div className="relative aspect-video w-full bg-black">
        <iframe key={track.id} className="absolute inset-0 h-full w-full" src={src} title={track.title} allow="autoplay; encrypted-media; picture-in-picture" />
      </div>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="min-w-0 flex-1 px-1">
          <span className="block truncate text-xs font-semibold" title={track.title}>{track.title}</span>
          <span className="block truncate text-[11px] text-neutral-500">{track.channel}</span>
        </span>
        <button type="button" onClick={prevTrack} disabled={index === 0} aria-label="Previous" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
          <SkipBack className="h-4 w-4" />
        </button>
        <button type="button" onClick={nextTrack} disabled={index >= queue.length - 1} aria-label="Next" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800">
          <SkipForward className="h-4 w-4" />
        </button>
        <button type="button" onClick={openMusic} aria-label="Change music" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <ListMusic className="h-4 w-4" />
        </button>
        <button type="button" onClick={stopMusic} aria-label="Stop music" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
