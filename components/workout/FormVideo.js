"use client";

import { useState } from "react";
import { PlayCircle, ChevronUp } from "lucide-react";
import RecipeVideo from "@/components/diet/RecipeVideo";

// "Form" button for an exercise: opens a short how-to video right under it (found once, cached).
export function FormVideoButton({ open, onToggle, className = "" }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${open ? "bg-red-600 text-white" : "bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400"} ${className}`}
    >
      {open ? <ChevronUp className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
      Form
    </button>
  );
}

export function FormVideo({ name }) {
  return (
    <div className="animate-fade-up mt-2 [animation-duration:200ms]">
      <RecipeVideo kind="exercise" dish={name} autoplay />
    </div>
  );
}

// Button + video in one, for simple lists.
export default function FormVideoToggle({ name }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FormVideoButton open={open} onToggle={() => setOpen((v) => !v)} />
      {open && <FormVideo name={name} />}
    </>
  );
}
