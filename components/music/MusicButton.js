"use client";

import { Music2 } from "lucide-react";
import { openMusic, useMusic } from "@/lib/music";

// Opens the music picker (workout or cooking picks). Shows a live dot while something is playing.
export default function MusicButton({ className = "", mode = "workout", label = "Music" }) {
  const { queue } = useMusic();
  return (
    <button
      type="button"
      onClick={() => openMusic(mode)}
      className={`relative inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 ${className}`}
    >
      <Music2 className="h-4 w-4 text-fuchsia-500" /> {label}
      {queue.length > 0 && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 animate-pulse rounded-full bg-fuchsia-500 ring-2 ring-white dark:ring-neutral-950" />}
    </button>
  );
}
