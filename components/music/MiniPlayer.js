"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, SkipForward, SkipBack, ListMusic, Maximize2, Minimize2 } from "lucide-react";
import { useMusic, stopMusic, nextTrack, prevTrack, openMusic } from "@/lib/music";

// Floating player that keeps playing across pages. It's YouTube's own player (free; YouTube's
// rules require the video to stay visible). The rest of the list plays automatically after it.
// Expand: our own full-screen view (YouTube's fullscreen button doesn't work inside apps on phones).
// It's the same player element, so the song keeps playing when you expand or shrink it.
export default function MiniPlayer() {
  const { queue, index } = useMusic();
  const pathname = usePathname();
  const [big, setBig] = useState(false);
  const track = queue[index];
  // While playing, pages get extra room at the bottom so the player never hides content.
  useEffect(() => {
    document.documentElement.classList.toggle("music-on", Boolean(track));
    return () => document.documentElement.classList.remove("music-on");
  }, [track]);
  useEffect(() => {
    if (!track) setBig(false);
  }, [track]);
  useEffect(() => {
    if (!big) return;
    const onKey = (e) => e.key === "Escape" && setBig(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden"; // the page behind doesn't scroll
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [big]);
  if (!track) return null;

  const rest = queue.slice(index + 1, index + 30).map((t) => t.id).join(",");
  const src = `https://www.youtube-nocookie.com/embed/${track.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1${rest ? `&playlist=${rest}` : ""}`;
  // During a workout the bottom of the screen is busy (next set, rest timer): sit at the top there.
  const inSession = pathname?.startsWith("/session");
  const place = inSession ? "top-[calc(env(safe-area-inset-top)+4.5rem)]" : "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-4";
  const btn = `flex shrink-0 items-center justify-center rounded-lg disabled:opacity-30 ${big ? "h-11 w-11 text-white/80 hover:bg-white/10" : "h-8 w-8 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`;
  const icon = big ? "h-5 w-5" : "h-4 w-4";

  return (
    <div
      className={
        big
          ? "fixed inset-0 z-[95] flex flex-col bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          : `fixed right-3 z-[75] w-[min(15rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl md:right-4 md:w-80 dark:border-neutral-800 dark:bg-neutral-900 ${place}`
      }
    >
      <div className={big ? "relative min-h-0 flex-1" : "relative aspect-video w-full bg-black"}>
        <iframe key={track.id} className="absolute inset-0 h-full w-full" src={src} title={track.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      </div>
      <div className={big ? "flex items-center gap-2 px-4 py-3" : "flex items-center gap-0.5 px-2 py-1.5"}>
        <span className="min-w-0 flex-1 px-1">
          <span className={`block truncate font-semibold ${big ? "text-sm text-white" : "text-xs"}`} title={track.title}>
            {track.title}
          </span>
          <span className={`block truncate ${big ? "text-xs text-white/60" : "text-[11px] text-neutral-500"}`}>{track.channel}</span>
        </span>
        {big && (
          <button type="button" onClick={prevTrack} disabled={index === 0} aria-label="Previous" className={btn}>
            <SkipBack className={icon} />
          </button>
        )}
        <button type="button" onClick={nextTrack} disabled={index >= queue.length - 1} aria-label="Next" className={btn}>
          <SkipForward className={icon} />
        </button>
        <button type="button" onClick={() => setBig((v) => !v)} aria-label={big ? "Shrink player" : "Expand player"} title={big ? "Shrink" : "Expand"} className={btn}>
          {big ? <Minimize2 className={icon} /> : <Maximize2 className={icon} />}
        </button>
        <button
          type="button"
          onClick={() => {
            setBig(false);
            openMusic();
          }}
          aria-label="Change music"
          className={btn}
        >
          <ListMusic className={icon} />
        </button>
        <button type="button" onClick={stopMusic} aria-label="Stop music" className={btn}>
          <X className={icon} />
        </button>
      </div>
    </div>
  );
}
