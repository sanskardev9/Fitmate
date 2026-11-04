"use client";

import { useId, useMemo, useState } from "react";
import { inputClass } from "./ui";

// Controlled searchable combobox. Typing reports free text through `onChange`; picking a
// suggestion (or the "Use …" row) calls `onSelect`, so a missing library entry never blocks anyone.
// Loose matching: ignores case, hyphens, spaces and word order, and plural "s".
// "90 degree handstand pushup" finds "90-degree Handstand Push-up Lean".
const compact = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const tokens = (t) =>
  String(t)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => (w.length > 3 ? w.replace(/s$/, "") : w));

export default function SearchSelect({ options, value, onChange, onSelect, placeholder = "Search…", limit = 8, className = "" }) {
  const query = value ?? "";
  const setQuery = onChange;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const matches = useMemo(() => {
    const q0 = compact(query);
    if (!q0) return options.slice(0, limit);
    // "pushups" should find "Push-up": try the singular too.
    const q = q0.length > 4 && q0.endsWith("s") ? q0.slice(0, -1) : q0;
    const words = tokens(query);
    const starts = [];
    const contains = [];
    const allWords = [];
    for (const o of options) {
      const n = compact(o.name);
      if (n.startsWith(q)) starts.push(o);
      else if (n.includes(q)) contains.push(o);
      else if (words.length > 1 && words.every((w) => n.includes(w))) allWords.push(o);
    }
    return [...starts, ...contains, ...allWords].slice(0, limit);
  }, [options, query, limit]);

  const trimmed = query.trim();
  const exact = matches.some((m) => compact(m.name) === compact(trimmed));
  const rows = trimmed && !exact ? [...matches, { name: trimmed, custom: true }] : matches;

  function choose(option) {
    setQuery(option.name);
    setOpen(false);
    onSelect(option);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && rows[active]) {
      e.preventDefault();
      choose(rows[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        className={`${inputClass} ${className}`}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {open && rows.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {rows.map((o, i) => (
            <li
              key={(o.custom ? "custom:" : "") + o.name}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 ${
                i === active ? "bg-emerald-50 dark:bg-emerald-950" : ""
              }`}
            >
              <span>{o.custom ? `Use "${o.name}"` : o.name}</span>
              {o.hint && !o.custom && <span className="shrink-0 text-xs text-neutral-500">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
