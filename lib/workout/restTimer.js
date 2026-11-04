import { getPreferences, setPreference } from "@/lib/services/preferencesService";
// Rest timer state, based on an end timestamp rather than a counting interval, so it stays
// correct through tab switches, phone sleep and page reloads (persisted in localStorage).

const KEY = "fitmate:rest";
let state = load();
const listeners = new Set();

function load() {
  if (typeof localStorage === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

function save(next) {
  state = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((fn) => fn());
}

export const getRest = () => state;
export function subscribeRest(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Remaining milliseconds (never negative).
export function remainingMs(s = state, now = Date.now()) {
  if (!s) return 0;
  return s.pausedRemaining != null ? s.pausedRemaining : Math.max(0, s.endAt - now);
}

export function startRest(seconds, label) {
  const ms = Math.max(5, seconds) * 1000;
  save({ endAt: Date.now() + ms, total: ms, base: ms, pausedRemaining: null, label, done: false });
}

export function adjustRest(deltaSec) {
  if (!state) return;
  const d = deltaSec * 1000;
  if (state.pausedRemaining != null) save({ ...state, pausedRemaining: Math.max(0, state.pausedRemaining + d), total: Math.max(state.total + d, 1000) });
  else save({ ...state, endAt: Math.max(Date.now(), state.endAt + d), total: Math.max(state.total + d, 1000) });
}

export function togglePause() {
  if (!state) return;
  if (state.pausedRemaining != null) save({ ...state, endAt: Date.now() + state.pausedRemaining, pausedRemaining: null });
  else save({ ...state, pausedRemaining: remainingMs() });
}

export const skipRest = () => save(null);

// Start the same rest again from its original length (running).
export function restartRest() {
  if (!state) return;
  const ms = state.base ?? state.total;
  save({ ...state, endAt: Date.now() + ms, total: ms, pausedRemaining: null, done: false });
}
export const markRestDone = () => state && save({ ...state, done: true });

// Whether logging a set starts the rest timer by itself. Stored as a synced preference (on by default).
export async function getAutoRest() {
  const prefs = await getPreferences();
  return prefs.autoRest !== false;
}
export const setAutoRest = (on) => setPreference("autoRest", on);

// --- alert --------------------------------------------------------------------------
let audio = null;

// Browsers only allow sound after a user gesture; call this from a tap (e.g. logging a set).
export function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  } catch {}
}

export function restAlert({ sound = true, vibrate = true } = {}) {
  if (vibrate) navigator.vibrate?.([250, 120, 250]);
  if (!sound || !audio) return;
  const t = audio.currentTime;
  [0, 0.22, 0.44].forEach((offset, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, t + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start(t + offset);
    osc.stop(t + offset + 0.2);
  });
}
