"use client";

import { useEffect, useState } from "react";
import { Share } from "lucide-react";
import { copyText } from "./PlanImport";

// Getting the prompt into an AI chat.
// Phones: the share sheet is the only reliable way to open the installed ChatGPT / Claude / Gemini
// app (web links usually open the website, especially from an installed web app like FitMate).
// Everywhere: website links as well. The prompt is always copied first, so pasting works too.
// Long prompts (e.g. a whole uploaded plan) don't fit in a link; those open the chat empty.
const MAX_URL_PROMPT = 6000;
const fits = (p) => encodeURIComponent(p).length <= MAX_URL_PROMPT;
const AIS = [
  { name: "ChatGPT", domain: "chatgpt.com", pkg: "com.openai.chatgpt", url: (p) => (fits(p) ? `https://chatgpt.com/?q=${encodeURIComponent(p)}` : "https://chatgpt.com/") },
  { name: "Claude", domain: "claude.ai", pkg: "com.anthropic.claude", url: (p) => (fits(p) ? `https://claude.ai/new?q=${encodeURIComponent(p)}` : "https://claude.ai/new") },
  { name: "Gemini", domain: "gemini.google.com", pkg: "com.google.android.apps.bard", url: () => "https://gemini.google.com/app" },
  { name: "Perplexity", domain: "perplexity.ai", pkg: "ai.perplexity.app.android", url: (p) => (fits(p) ? `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}` : "https://www.perplexity.ai/") },
];

// Android: open the installed app straight away with the prompt as shared text (any length);
// the website opens instead if the app isn't installed.
const androidIntent = (ai, p) =>
  `intent:#Intent;action=android.intent.action.SEND;type=text/plain;S.android.intent.extra.TEXT=${encodeURIComponent(p)};package=${ai.pkg};S.browser_fallback_url=${encodeURIComponent(ai.url(""))};end`;
const icon = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

export default function AiLinks({ prompt, onCopied }) {
  const [canShare, setCanShare] = useState(false);
  const [platform, setPlatform] = useState(null); // "android" | "ios" | null
  const [shareNote, setShareNote] = useState("");
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches);
    const ua = navigator.userAgent;
    setPlatform(/android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : null);
  }, []);

  // Tapping an AI: Android opens the app with the prompt; iPhone uses the app link when the prompt
  // fits in it, otherwise the share sheet (tap the app there). Always copied first.
  async function openAi(e, ai) {
    copyText(prompt).then((ok) => ok && onCopied?.());
    if (platform === "android") {
      e.preventDefault();
      window.location.href = androidIntent(ai, prompt);
      return;
    }
    if (platform === "ios" && !fits(prompt) && canShare) {
      e.preventDefault();
      try {
        await navigator.share({ text: prompt });
      } catch (err) {
        if (err?.name !== "AbortError") window.open(ai.url(prompt), "_blank", "noopener");
      }
    }
  }

  async function shareToApp() {
    setShareNote("");
    if (await copyText(prompt)) onCopied?.();
    try {
      await navigator.share({ text: prompt });
    } catch (e) {
      // Closed the sheet: nothing to do. Anything else: the prompt is copied, so pasting works.
      if (e?.name !== "AbortError") setShareNote("Couldn't open the share sheet. The prompt is copied: open your AI app and paste it.");
    }
  }

  return (
    <div className="mt-3">
      {canShare && (
        <>
          <button type="button" onClick={shareToApp} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left transition-colors active:scale-[0.99] active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-800">
            <span className="flex shrink-0 -space-x-2">
              {AIS.slice(0, 3).map((ai) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={ai.name} src={icon(ai.domain)} alt="" width={28} height={28} className="h-7 w-7 rounded-lg bg-white ring-2 ring-white dark:ring-neutral-900" />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Open in your AI app</span>
              <span className="block text-xs text-neutral-500">Then pick ChatGPT, Claude or Gemini</span>
            </span>
            <Share className="h-5 w-5 shrink-0 text-neutral-400" />
          </button>
          {shareNote && <p className="mt-2 text-xs text-rose-600">{shareNote}</p>}
        </>
      )}

      <p className="mt-3 mb-2 text-xs text-neutral-500">
        {platform === "android" ? "Or open it straight in the app:" : platform === "ios" ? (fits(prompt) ? "Or open it straight in:" : "Or pick an app (opens the share sheet):") : fits(prompt) ? "Or open it straight in:" : "Or open a chat (the prompt is copied, just paste it):"}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {AIS.map((ai) => (
          <a
            key={ai.name}
            href={ai.url(prompt)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openAi(e, ai)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 py-2.5 text-[11px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 active:scale-95 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon(ai.domain)} alt="" width={28} height={28} className="h-7 w-7 rounded-lg" loading="lazy" />
            {ai.name}
          </a>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-neutral-100 px-3 py-2.5 text-xs leading-relaxed text-neutral-600 dark:bg-neutral-800/70 dark:text-neutral-300">
        <b className="font-semibold">Tip:</b> if ChatGPT says <i>&ldquo;Thinking…&rdquo;</i> for a while, tap <b>Skip</b> (or pick the <b>Instant</b> model) and it starts writing right away.
      </p>
    </div>
  );
}
