"use client";

import { useSyncExternalStore } from "react";

// Workout music: what's playing (a queue of YouTube videos) and whether the picker is open.
// Lives outside React so the player keeps going while you move between pages.
let state = { queue: [], index: 0, picker: false, mode: "workout" }; // mode: "workout" | "cooking"
const listeners = new Set();
const emit = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};

// radio: a song you searched for plays first, then YouTube's mix of related songs.
export const playMusic = (queue, index = 0, radio = false) => emit({ queue, index, radio, picker: false });
export const nextTrack = () => state.index < state.queue.length - 1 && emit({ index: state.index + 1 });
export const prevTrack = () => state.index > 0 && emit({ index: state.index - 1 });
export const stopMusic = () => emit({ queue: [], index: 0 });
export const openMusic = (mode = "workout") => emit({ picker: true, mode: mode === "cooking" ? "cooking" : "workout" });
export const closeMusic = () => emit({ picker: false });

const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const empty = { queue: [], index: 0, picker: false, mode: "workout" };
export const useMusic = () => useSyncExternalStore(subscribe, () => state, () => empty);

// Another video (recipe, exercise form) is playing: pause the music, then resume it once that video
// closes. YouTube only plays one video at a time, so without this the music just stops.
const holders = new Set();
export const holdMusic = (who) => {
  holders.add(who);
  window.dispatchEvent(new CustomEvent("fitmate:music-hold", { detail: true }));
};
export const releaseMusic = (who) => {
  holders.delete(who);
  if (!holders.size) window.dispatchEvent(new CustomEvent("fitmate:music-hold", { detail: false }));
};
