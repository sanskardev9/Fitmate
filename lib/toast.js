"use client";

import { useSyncExternalStore } from "react";

// App-wide toasts: toast.success("Saved"), toast.error("Wrong code"), toast.info("Code sent").
let list = [];
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
let n = 0;

function push(kind, message, ms = 3500) {
  const id = ++n;
  list = [...list.slice(-2), { id, kind, message }]; // at most 3 on screen
  emit();
  setTimeout(() => dismiss(id), ms);
  return id;
}
export function dismiss(id) {
  list = list.filter((t) => t.id !== id);
  emit();
}
export function clearToasts() {
  list = [];
  emit();
}
export const toast = {
  clear: clearToasts,
  success: (m, ms) => push("success", m, ms),
  error: (m, ms) => push("error", m, ms ?? 4500),
  info: (m, ms) => push("info", m, ms),
};

const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const empty = [];
export const useToasts = () => useSyncExternalStore(subscribe, () => list, () => empty);
