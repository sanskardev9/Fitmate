"use client";

import { useState } from "react";
import { Star, Check } from "lucide-react";
import FoldHeader, { FoldButton } from "@/components/common/FoldHeader";
import { supabase } from "@/lib/supabase/client";

const KINDS = [
  ["review", "Review"],
  ["idea", "Idea"],
  ["bug", "Bug"],
  ["other", "Other"],
];

// Rate FitMate and send feedback. Stored in public.feedback (each user sees only their own).
export default function FeedbackCard() {
  const [open, setOpen] = useState(false); // folded until tapped
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [kind, setKind] = useState("review");
  const [message, setMessage] = useState("");
  const [allowPublic, setAllowPublic] = useState(true);
  const [state, setState] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");

  async function send(e) {
    e.preventDefault();
    if (!rating && !message.trim()) return setError("Add a rating or a message.");
    setState("sending");
    setError("");
    const { error: err } = await supabase.from("feedback").insert({ rating: rating || null, kind, message: message.trim() || null, allow_public: kind === "review" && allowPublic });
    if (err) {
      setState("idle");
      return setError("Couldn't send. Check your connection and try again.");
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
        <p className="mt-3 font-semibold">Thank you!</p>
        <p className="text-sm text-neutral-500">We read every message. It helps shape what we build next.</p>
        <button type="button" onClick={() => { setState("idle"); setRating(0); setMessage(""); }} className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Send more
        </button>
      </section>
    );
  }

  const shown = hover || rating;
  if (!open) return <FoldHeader Icon={Star} tint="bg-amber-500/10 text-amber-500" title="Rate FitMate" sub="Tell us how it's going, share an idea or report a bug" onOpen={() => setOpen(true)} />;
  return (
    <form onSubmit={send} className="rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Rate FitMate</h2>
          <p className="text-sm text-neutral-500">How is it helping you stay on track?</p>
        </div>
        <FoldButton onClose={() => setOpen(false)} />
      </div>

      <div className="mt-3 flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="rounded-lg p-1 transition-transform active:scale-90">
            <Star className={`h-8 w-8 transition-colors ${n <= shown ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-600"}`} />
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {KINDS.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setKind(v)}
            className={`h-9 rounded-full border px-3.5 text-sm font-medium transition-colors ${kind === v ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
        rows={3}
        placeholder={kind === "bug" ? "What went wrong, and where?" : kind === "idea" ? "What would make FitMate better for you?" : "Tell us what you think…"}
        className="mt-3 w-full rounded-xl border border-neutral-300 bg-transparent p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700"
      />
      {kind === "review" && (
        <label className="mt-2 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <input type="checkbox" checked={allowPublic} onChange={(e) => setAllowPublic(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
          OK to show my review (with first name) on the website
        </label>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="mt-4 h-11 w-full rounded-xl bg-emerald-600 font-semibold text-white active:bg-emerald-700 disabled:opacity-50">
        {state === "sending" ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
