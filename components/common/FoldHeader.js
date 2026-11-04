"use client";

import { ChevronDown } from "lucide-react";

// Folded card on Profile: icon, title, one line, arrow. Tap to open the full card.
export default function FoldHeader({ Icon, tint, title, sub, onOpen }) {
  return (
    <button type="button" onClick={onOpen} aria-expanded={false} className="flex w-full items-center gap-3 rounded-3xl border border-neutral-200 bg-white p-5 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-neutral-500">{sub}</span>
      </span>
      <ChevronDown className="h-5 w-5 shrink-0 text-neutral-400" />
    </button>
  );
}

// The arrow that folds an open card again.
export function FoldButton({ onClose }) {
  return (
    <button type="button" onClick={onClose} aria-label="Fold" aria-expanded className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
      <ChevronDown className="h-5 w-5 rotate-180" />
    </button>
  );
}
