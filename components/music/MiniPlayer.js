"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X, SkipForward, SkipBack, ListMusic, Maximize2, Minimize2, ChevronDown, ChevronUp } from "lucide-react";
import { useMusic, stopMusic, openMusic } from "@/lib/music";

// Floating player that keeps playing across pages. It's YouTube's own player (free; YouTube's
// rules require the video to stay visible). The rest of the list plays automatically after it;
// a song you searched for continues into YouTube's mix of related songs (radio).
// Next/previous are sent to the player itself, and it tells us what's playing, so the title is right.
// Expand: our own full-screen view (YouTube's fullscreen button doesn't work inside apps on phones).
// It's the same player element, so the song keeps playing when you expand or shrink it.
export default function MiniPlayer() {
  const { queue, index, radio } = useMusic();
  const pathname = usePathname();
  const [big, setBig] = useState(false);
  // Minimised: a slim bar with a small video (it stays visible, as YouTube requires). Remembered.
  const [small, setSmallState] = useState(false);
  useEffect(() => {
    try {
      setSmallState(localStorage.getItem("fitmate:music-small") === "1");
    } catch {}
  }, []);
  const setSmall = (v) => {
    setSmallState(v);
    try {
      localStorage.setItem("fitmate:music-small", v ? "1" : "0");
    } catch {}
  };
  const frame = useRef(null);
  const [now, setNow] = useState(null); // { title, author, at, count } from the player
  const track = queue[index];

  // Listen to the player: current song and where it is in the list.
  useEffect(() => {
    setNow(null);
    if (!track) return;
    const onMessage = (e) => {
      if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin) || e.source !== frame.current?.contentWindow) return;
      let d;
      try {
        d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      const info = d?.info;
      if (!info) return;
      setNow((n) => ({
        title: info.videoData?.title || n?.title,
        author: info.videoData?.author || n?.author,
        at: info.playlistIndex ?? n?.at ?? 0,
        count: info.playlist?.length ?? n?.count ?? 1,
      }));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [track]);
  // While playing, pages get extra room at the bottom so the player never hides content.
  useEffect(() => {
    document.documentElement.classList.toggle("music-on", Boolean(track) && !small);
    document.documentElement.classList.toggle("music-small", Boolean(track) && small);
    return () => document.documentElement.classList.remove("music-on", "music-small");
  }, [track, small]);
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
  const origin = typeof window === "undefined" ? "" : `&origin=${encodeURIComponent(window.location.origin)}`;
  const list = radio ? `&list=RD${track.id}` : rest ? `&playlist=${rest}` : "";
  const src = `https://www.youtube-nocookie.com/embed/${track.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1${origin}${list}`;
  const command = (func) => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
  const listen = () => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
  const at = now?.at ?? 0;
  const count = now?.count ?? (radio ? 50 : queue.length - index);
  const title = now?.title || track.title;
  const channel = now?.author || track.channel;
  // During a workout the bottom of the screen is busy (next set, rest timer): sit at the top there.
  const inSession = pathname?.startsWith("/session");
  const place = inSession ? "top-[calc(env(safe-area-inset-top)+4.5rem)]" : "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-4";
  const mini = small && !big;
  const btn = `flex shrink-0 items-center justify-center rounded-lg disabled:opacity-30 ${big ? "h-11 w-11 text-white/80 hover:bg-white/10" : "h-8 w-8 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`;
  const icon = big ? "h-5 w-5" : "h-4 w-4";

  return (
    <div
      className={
        big
          ? "fixed inset-0 z-[95] flex flex-col bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          : mini
            ? `fixed right-3 z-[75] flex w-[min(20rem,calc(100vw-1.5rem))] items-center gap-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-2xl md:right-4 dark:border-neutral-800 dark:bg-neutral-900 ${place}`
            : `fixed right-3 z-[75] w-[min(15rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl md:right-4 md:w-80 dark:border-neutral-800 dark:bg-neutral-900 ${place}`
      }
    >
      <div className={big ? "relative min-h-0 flex-1" : mini ? "relative h-10 w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-black" : "relative aspect-video w-full bg-black"}>
        <iframe ref={frame} key={`${track.id}${radio ? "r" : ""}`} onLoad={listen} className="absolute inset-0 h-full w-full" src={src} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      </div>
      <div className={big ? "flex items-center gap-2 px-4 py-3" : mini ? "flex min-w-0 flex-1 items-center gap-0.5" : "flex items-center gap-0.5 px-2 py-1.5"}>
        <span className="min-w-0 flex-1 px-1">
          <span className={`block truncate font-semibold ${big ? "text-sm text-white" : "text-xs"}`} title={title}>
            {title}
          </span>
          <span className={`block truncate ${big ? "text-xs text-white/60" : "text-[11px] text-neutral-500"}`}>{channel}</span>
        </span>
        {big && (
          <button type="button" onClick={() => command("previousVideo")} disabled={at === 0} aria-label="Previous" className={btn}>
            <SkipBack className={icon} />
          </button>
        )}
        <button type="button" onClick={() => command("nextVideo")} disabled={at >= count - 1} aria-label="Next" className={btn}>
          <SkipForward className={icon} />
        </button>
        {mini ? (
          <button type="button" onClick={() => setSmall(false)} aria-label="Show player" title="Show player" className={btn}>
            <ChevronUp className={icon} />
          </button>
        ) : (
          <>
            {!big && (
              <button type="button" onClick={() => setSmall(true)} aria-label="Minimise player" title="Minimise" className={btn}>
                <ChevronDown className={icon} />
              </button>
            )}
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
          </>
        )}
        <button type="button" onClick={stopMusic} aria-label="Stop music" className={btn}>
          <X className={icon} />
        </button>
      </div>
    </div>
  );
}
