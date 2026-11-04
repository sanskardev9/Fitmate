"use client";

import { useEffect, useRef } from "react";

// When a screen swaps to its next step without changing the URL, start the new step at the top
// (otherwise it opens wherever the old step was scrolled to, often the very bottom).
// Runs after the new step has rendered, and jumps instantly so a shrinking page can't cut it short.
export function useScrollTopOn(key) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  }, [key]);
}
