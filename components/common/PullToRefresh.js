"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";

// Pull down from the top to refresh, for FitMate opened from the Home Screen (no browser
// refresh button there). Browsers already have their own, so this only runs in the installed app.
// Reloading also re-downloads everything from the server (first sync of a fresh load is a full one).
const TRIGGER = 72; // px of pull needed to refresh
const MAX = 110;

// Is the touch inside something that scrolls on its own and isn't at its top, or inside a sheet/dialog?
function blocked(target) {
  for (let el = target; el && el !== document.body; el = el.parentElement) {
    if (el.matches?.('[role="dialog"], [aria-modal="true"], [data-no-ptr]')) return true;
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight && el.scrollTop > 0) return true;
  }
  return false;
}

export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef(null);
  const dist = useRef(0);

  useEffect(() => {
    const installed = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (!installed) return;

    const onStart = (e) => {
      if (refreshingNow() || window.scrollY > 0 || e.touches.length !== 1 || blocked(e.target)) return (start.current = null);
      start.current = e.touches[0].clientY;
      dist.current = 0;
    };
    const onMove = (e) => {
      if (start.current == null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        dist.current = 0;
        setPull(0);
        return;
      }
      e.preventDefault(); // hold the page still while pulling
      dist.current = Math.min(MAX, dy * 0.5); // resistance
      setPull(dist.current);
    };
    const onEnd = () => {
      if (start.current == null) return;
      start.current = null;
      if (dist.current >= TRIGGER) {
        setRefreshing(true);
        setPull(TRIGGER);
        navigator.vibrate?.(10);
        setTimeout(() => window.location.reload(), 350);
      } else setPull(0);
      dist.current = 0;
    };
    let isRefreshing = false;
    const refreshingNow = () => isRefreshing;

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      isRefreshing = true;
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (!pull && !refreshing) return null;
  const progress = Math.min(1, pull / TRIGGER);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center" style={{ transform: `translateY(calc(env(safe-area-inset-top) + ${pull - 44}px))`, transition: start.current == null ? "transform 200ms ease" : "none" }}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900" style={{ opacity: Math.max(0.3, progress) }}>
        <RotateCw
          className={`h-5 w-5 ${progress >= 1 ? "text-emerald-600" : "text-neutral-400"} ${refreshing ? "animate-spin" : ""}`}
          style={refreshing ? undefined : { transform: `rotate(${progress * 300}deg)` }}
        />
      </span>
    </div>
  );
}
