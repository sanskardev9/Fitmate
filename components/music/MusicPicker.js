"use client";

import { useEffect, useState } from "react";
import { Search, X, Music2, Play, ArrowUpLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { closeMusic, playMusic, useMusic } from "@/lib/music";

// Bottom sheet: quick workout playlists + YouTube music search. Tap a song to play; the rest of the
// list plays after it. Free: YouTube's own player, searches cached on our server.
const WORKOUT_PICKS = [
  ["Calisthenics", "calisthenics workout motivation music"],
  ["Gym motivation", "gym motivation songs workout mix"],
  ["Hindi gym", "hindi gym workout songs"],
  ["Punjabi", "punjabi workout songs gym"],
  ["Phonk", "phonk gym workout mix"],
  ["Rap", "rap workout music mix"],
  ["Running", "running music motivation mix"],
  ["Lo-fi focus", "lofi focus music"],
];
// Cooking time: easy, feel-good songs for the kitchen.
const COOKING_PICKS = [
  ["Cooking vibes", "cooking vibes songs playlist"],
  ["Bollywood chill", "bollywood chill songs playlist"],
  ["Lo-fi kitchen", "lofi cooking music"],
  ["Retro Hindi", "old hindi songs kishore kumar lata playlist"],
  ["Acoustic", "acoustic chill songs playlist"],
  ["Punjabi chill", "punjabi chill songs playlist"],
  ["Jazz cafe", "jazz cafe music cooking"],
  ["Sufi", "sufi songs playlist"],
];
const MODES = {
  workout: { title: "Workout music", picks: WORKOUT_PICKS },
  cooking: { title: "Cooking music", picks: COOKING_PICKS },
};

async function search(q) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`/api/music?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Couldn't search right now.");
  return json.results ?? [];
}

export default function MusicPicker() {
  const { picker, queue, index, mode } = useMusic();
  const { title, picks: PICKS } = MODES[mode] ?? MODES.workout;
  const [active, setActive] = useState(WORKOUT_PICKS[0][1]);
  // Opened from Diet vs Workout: start on that mode's first pick.
  useEffect(() => {
    if (!picker) return;
    const first = (MODES[mode] ?? MODES.workout).picks[0][1];
    setActive((a) => ((MODES[mode] ?? MODES.workout).picks.some(([, q]) => q === a) ? a : first));
    setText("");
  }, [picker, mode]);
  const [text, setText] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [typing, setTyping] = useState(false);

  // Suggestions while typing (debounced; free, no search quota used).
  useEffect(() => {
    const q = text.trim();
    if (!typing || q.length < 2) return setSuggestions([]);
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/music/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((j) => !cancelled && setSuggestions(j.suggestions ?? []))
        .catch(() => {});
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text, typing]);

  const runSearch = (q) => {
    const v = q.trim();
    if (v.length < 2) return;
    setText(v);
    setActive(v);
    setTyping(false);
    setSuggestions([]);
  };

  useEffect(() => {
    if (!picker) return;
    let cancelled = false;
    setResults(null);
    setError("");
    search(active)
      .then((r) => !cancelled && setResults(r))
      .catch((e) => !cancelled && (setError(e.message), setResults([])));
    return () => {
      cancelled = true;
    };
  }, [picker, active]);

  useEffect(() => {
    if (!picker) return;
    const onKey = (e) => e.key === "Escape" && closeMusic();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picker]);

  if (!picker) return null;
  const playingId = queue[index]?.id;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={closeMusic}>
      <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()} className="animate-fade-up flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl bg-[var(--background)] pb-[env(safe-area-inset-bottom)] shadow-2xl [animation-duration:220ms] sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white">
              <Music2 className="h-4 w-4" />
            </span>
            {title}
          </h2>
          <button type="button" onClick={closeMusic} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="shrink-0 px-5 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(text);
          }}
        >
          <div className="relative">
            <label className="relative block">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setTyping(true);
                }}
                onBlur={() => setTimeout(() => setTyping(false), 150)}
                placeholder="Search songs, artists, playlists"
                enterKeyHint="search"
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white pr-3 pl-9 text-sm outline-none focus:border-fuchsia-500 dark:border-neutral-800 dark:bg-neutral-900"
              />
            </label>
            {typing && suggestions.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                {suggestions.map((sug) => (
                  <li key={sug}>
                    <div className="flex items-center">
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => runSearch(sug)} className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate">{sug}</span>
                      </button>
                      <button type="button" aria-label={`Edit "${sug}"`} onMouseDown={(e) => e.preventDefault()} onClick={() => setText(`${sug} `)} className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <ArrowUpLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>

        <div className="flex shrink-0 gap-2 overflow-x-auto px-5 pt-3 pb-2 [scrollbar-width:none]">
          {PICKS.map(([label, q]) => (
            <button key={label} type="button" onClick={() => { setActive(q); setText(""); }} className={`h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${active === q ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300" : "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {error && <p className="px-2 py-6 text-center text-sm text-neutral-500">{error}</p>}
          {!results && !error && (
            <ul className="space-y-2 px-2 pt-2">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="flex gap-3">
                  <span className="h-12 w-20 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                  <span className="flex-1 space-y-2 pt-1">
                    <span className="block h-3 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <span className="block h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {results?.length === 0 && !error && <p className="px-2 py-6 text-center text-sm text-neutral-500">Nothing found. Try another search.</p>}
          <ul>
            {results?.map((r, i) => (
              <li key={r.id}>
                <button type="button" onClick={() => playMusic(results, i)} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60 ${playingId === r.id ? "bg-fuchsia-500/10" : ""}`}>
                  <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${r.id}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" />
                    {playingId === r.id && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-medium">{r.title}</span>
                    <span className="block text-xs text-neutral-500">{r.channel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
