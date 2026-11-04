"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Share2, Link2, Check, Users } from "lucide-react";
import { loadStreak } from "@/lib/services/streak";
import { copyText } from "./PlanImport";

// Invite friends: native share sheet on phones, WhatsApp, or copy the link. Uses their streak.
export default function ShareCard() {
  const streak = useLiveQuery(() => loadStreak().then((s) => s.current), []);
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin : "https://fitmateapp.vercel.app";
  const text =
    streak > 0
      ? `I'm on a ${streak}-day streak following my workout and diet plan on FitMate. Come keep me company:`
      : "I'm following my workout and diet plan on FitMate. Come do it with me:";

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "FitMate", text, url });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    copy();
  }
  async function copy() {
    if (await copyText(`${text} ${url}`)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-white to-white p-5 dark:via-neutral-900 dark:to-neutral-900">
      <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
          <Users className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">Bring a friend</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Plans are easier to follow together. Share FitMate with someone who trains with you.</p>
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
        <button type="button" onClick={share} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[0.99]">
          <Share2 className="h-4 w-4" /> Share FitMate
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          title="WhatsApp"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#25D366" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" />
          </svg>
        </a>
        <button type="button" onClick={copy} aria-label="Copy link" title="Copy link" className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
          {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Link2 className="h-5 w-5 text-neutral-500" />}
        </button>
      </div>
      {copied && <p className="relative mt-2 text-xs text-emerald-700 dark:text-emerald-400">Link copied. Paste it anywhere.</p>}
    </section>
  );
}
