"use client";

import { useId, useMemo, useState } from "react";
import { inputClass } from "./ui";

// Controlled searchable combobox. Typing reports free text through `onChange`; picking a
// suggestion (or the "Use …" row) calls `onSelect`, so a missing library entry never blocks anyone.
export default function SearchSelect({ options, value, onChange, onSelect, placeholder = "Search…", limit = 8, className = "" }) {
  const query = value ?? "";
  const setQuery = onChange;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, limit);
    const starts = [];
    const contains = [];
    for (const o of options) {
      const n = o.name.toLowerCase();
      if (n.startsWith(q)) starts.push(o);
      else if (n.includes(q) || o.hint?.toLowerCase().includes(q)) contains.push(o);
    }
    return [...starts, ...contains].slice(0, limit);
  }, [options, query, limit]);

  const trimmed = query.trim();
  const exact = matches.some((m) => m.name.toLowerCase() === trimmed.toLowerCase());
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
