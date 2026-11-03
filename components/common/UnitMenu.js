"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// App-styled unit picker (not the browser's native select): a compact button that opens a small menu.
export default function UnitMenu({ value, options, onChange, className = "", buttonClassName, lowercase = true, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find(([v]) => v === value)?.[1] ?? value;

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName ?? "flex h-full items-center gap-1 rounded-r-lg border-l border-neutral-200 bg-neutral-50 px-2.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"}
      >
        {lowercase ? current.toLowerCase() : current}
        <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" className={`animate-fade-up absolute top-full ${align === "left" ? "left-0" : "right-0"} z-40 mt-1.5 min-w-28 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-xl [animation-duration:150ms] dark:border-neutral-700 dark:bg-neutral-900`}>
          {options.map(([v, l]) => {
            const active = v === value;
            return (
              <li key={v}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${active ? "font-semibold text-emerald-600 dark:text-emerald-400" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
                >
                  {lowercase ? l.toLowerCase() : l}
                  {active && <Check className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
