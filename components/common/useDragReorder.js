"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const HOLD_MS = 160; // press-and-hold before a drag starts, so taps and scrolls don't move things
const EDGE = 80; // px from the viewport edge where dragging scrolls the page
const GAP = 12; // vertical gap between items (matches space-y-3 in the builders)

// Smooth hold-and-drag reordering (no library):
// - on hold, `collapsed` turns true so the list can render compact rows;
// - the dragged row follows the pointer and the others slide aside with CSS transforms,
//   all via direct DOM writes (no React re-render per move);
// - the order is committed once on release via onMove(from, to).
export function useDragReorder(onMove) {
  const items = useRef([]);
  const s = useRef(null); // { from, to, pointerY, grab, slots: [{top,height}], active }
  const timer = useRef(null);
  const raf = useRef(null);
  const [dragging, setDragging] = useState(null);

  useEffect(() => () => {
    clearTimeout(timer.current);
    cancelAnimationFrame(raf.current);
  }, []);

  // After rows collapse, measure them (page coordinates, so auto-scroll doesn't break the maths).
  useLayoutEffect(() => {
    const st = s.current;
    if (dragging == null || !st) return;
    st.slots = items.current.map((el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: r.height };
    });
    const me = st.slots[st.from];
    st.grab = me ? me.height / 2 : 0;
    // Keep the lifted row under the finger after the list shrank.
    const wanted = st.pointerY + window.scrollY - st.grab;
    if (me && Math.abs(wanted - me.top) > me.height) window.scrollBy(0, me.top - wanted);
    paint();
    raf.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  function paint() {
    const st = s.current;
    if (!st?.slots) return;
    const pageY = st.pointerY + window.scrollY;
    const me = st.slots[st.from];
    if (!me) return;
    // Target slot = the one whose middle the pointer has passed.
    let to = 0;
    st.slots.forEach((slot, i) => {
      if (slot && pageY > slot.top + slot.height / 2) to = i;
    });
    st.to = to;
    const shift = me.height + GAP;
    items.current.forEach((el, i) => {
      if (!el) return;
      if (i === st.from) {
        el.style.transform = `translateY(${pageY - st.grab - me.top}px) scale(1.02)`;
        return;
      }
      let y = 0;
      if (st.from < to && i > st.from && i <= to) y = -shift;
      if (st.from > to && i >= to && i < st.from) y = shift;
      el.style.transform = y ? `translateY(${y}px)` : "";
    });
  }

  function tick() {
    const st = s.current;
    if (!st?.active) return;
    const y = st.pointerY;
    const speed = y < EDGE ? -(EDGE - y) / 3 : y > window.innerHeight - EDGE ? (y - (window.innerHeight - EDGE)) / 3 : 0;
    if (speed) window.scrollBy(0, speed);
    paint();
    raf.current = requestAnimationFrame(tick);
  }

  function end() {
    clearTimeout(timer.current);
    cancelAnimationFrame(raf.current);
    const st = s.current;
    s.current = null;
    items.current.forEach((el) => {
      if (!el) return;
      el.style.transition = "none";
      el.style.transform = "";
      requestAnimationFrame(() => el && (el.style.transition = ""));
    });
    if (st?.active && st.to != null && st.to !== st.from) onMove(st.from, st.to);
    if (st?.active) setDragging(null);
  }

  const handleProps = (index) => ({
    style: { touchAction: "none" },
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      s.current = { from: index, to: index, pointerY: e.clientY, startY: e.clientY, active: false };
      timer.current = setTimeout(() => {
        if (!s.current) return;
        s.current.active = true;
        navigator.vibrate?.(10);
        setDragging(index);
      }, HOLD_MS);
    },
    onPointerMove: (e) => {
      const st = s.current;
      if (!st) return;
      st.pointerY = e.clientY;
      if (!st.active && Math.abs(e.clientY - st.startY) > 8) end(); // moved before the hold finished
    },
    onPointerUp: end,
    onPointerCancel: end,
  });

  const itemProps = (index) => ({
    ref: (el) => (items.current[index] = el),
    style: dragging == null ? undefined : index === dragging ? { position: "relative", zIndex: 30, transition: "box-shadow 150ms" } : { transition: "transform 200ms cubic-bezier(0.2, 0, 0, 1)" },
  });

  return { handleProps, itemProps, dragging, collapsed: dragging != null };
}
