"use client";

import { useEffect, useState } from "react";
import { X, Share, SquarePlus } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cachedProfile, fetchProfile } from "@/lib/services/profileService";

// "Add to Home Screen" suggestion for phones using FitMate in the browser. Android gets the real
// install prompt; iPhone gets the two steps (it has no prompt). Hidden once installed, and
// "not now" hides it for longer each time (3, 7, 21, 45 days).
const KEY = "fitmate:installNudge";
const SNOOZE_DAYS = [3, 7, 21, 45];

const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function readState() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") ?? { until: 0, times: 0 };
  } catch {
    return { until: 0, times: 0 };
  }
}

const DONE_KEY = "fitmate:installDone";

export default function InstallNudge() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [steps, setSteps] = useState(false);
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    if (standalone() || !window.matchMedia("(pointer: coarse)").matches || Date.now() < readState().until) return;
    try {
      if (localStorage.getItem(DONE_KEY)) return; // said "Already added"
    } catch {}
    // Already opened FitMate from a Home Screen on this account: no need to ask.
    if (user && cachedProfile(user.id)?.app_installed_at) return;
    if (user) fetchProfile(user.id).then((p) => p?.app_installed_at && setShow(false)).catch(() => {});
    setIos(isIos());
    setPrompt(window.__fitmateInstall ?? null);
    const onPrompt = () => setPrompt(window.__fitmateInstall ?? null);
    const onInstalled = () => setShow(false);
    window.addEventListener("fitmate:installable", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    setShow(true);
    return () => {
      window.removeEventListener("fitmate:installable", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [user]);

  if (!show) return null;

  function alreadyAdded() {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {}
    setShow(false);
  }

  function snooze() {
    const st = readState();
    const days = SNOOZE_DAYS[Math.min(st.times, SNOOZE_DAYS.length - 1)];
    try {
      localStorage.setItem(KEY, JSON.stringify({ until: Date.now() + days * 86400000, times: st.times + 1 }));
    } catch {}
    setShow(false);
  }
  async function add() {
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice.catch(() => ({}));
      window.__fitmateInstall = null;
      setPrompt(null);
      if (outcome === "accepted") setShow(false);
      return;
    }
    setSteps((v) => !v);
  }

  return (
    <section className="animate-fade-up rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl shadow-sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Add to Home Screen</p>
          <p className="text-xs text-neutral-500">Full screen, one tap away. Feels like a real app.</p>
        </div>
        <button type="button" onClick={add} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white active:bg-emerald-700">
          {prompt || !ios ? "Add" : steps ? "Hide" : "How"}
        </button>
        <button type="button" onClick={snooze} aria-label="Not now" className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 pl-[52px] text-xs text-neutral-500">
        Already on your Home Screen?{" "}
        <button type="button" onClick={alreadyAdded} className="font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400">
          Yes, it&apos;s added
        </button>
      </p>
      {steps && (
        <ol className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          {ios ? (
            <>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">1</span>
                Tap <Share className="h-4 w-4 text-sky-500" /> <b>Share</b> in Safari&apos;s toolbar
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">2</span>
                Pick <SquarePlus className="h-4 w-4" /> <b>Add to Home Screen</b>
              </li>
            </>
          ) : (
            <li>Open your browser menu (⋮) and pick <b>Install app</b> or <b>Add to Home screen</b>.</li>
          )}
        </ol>
      )}
    </section>
  );
}
