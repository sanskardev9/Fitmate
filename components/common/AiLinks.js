"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { copyText } from "./PlanImport";

// Getting the prompt into an AI chat.
// Phones: tapping an AI copies the full prompt and opens the installed app (nothing pre-filled, so the
// prompt is never shortened); you paste it there. If the app doesn't open, the website opens instead.
// Computers: the website, with the prompt pre-filled when it fits in a link (always copied too).
const MAX_URL_PROMPT = 6000;
const fits = (p) => encodeURIComponent(p).length <= MAX_URL_PROMPT;

const AIS = [
  {
    name: "ChatGPT",
    domain: "chatgpt.com",
    home: "https://chatgpt.com/",
    pkg: "com.openai.chatgpt",
    ios: "chatgpt://", // the app's own address: opens the app, not the website
    url: (p) => (fits(p) ? `https://chatgpt.com/?q=${encodeURIComponent(p)}` : "https://chatgpt.com/"),
  },
  {
    name: "Claude",
    domain: "claude.ai",
    home: "https://claude.ai/new",
    pkg: "com.anthropic.claude",
    url: (p) => (fits(p) ? `https://claude.ai/new?q=${encodeURIComponent(p)}` : "https://claude.ai/new"),
  },
  {
    name: "Gemini",
    domain: "gemini.google.com",
    home: "https://gemini.google.com/app",
    pkg: "com.google.android.apps.bard",
    url: () => "https://gemini.google.com/app",
  },
  {
    name: "Perplexity",
    domain: "perplexity.ai",
    home: "https://www.perplexity.ai/",
    pkg: "ai.perplexity.app.android",
    ios: "perplexity-app://",
    url: (p) => (fits(p) ? `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}` : "https://www.perplexity.ai/"),
  },
];

// Android: launch the installed app itself; the website if it isn't installed.
const androidLaunch = (ai) =>
  `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${ai.pkg};S.browser_fallback_url=${encodeURIComponent(ai.home)};end`;
const icon = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

export default function AiLinks({ prompt, onCopied }) {
  const [platform, setPlatform] = useState(null); // "android" | "ios" | null (computer)
  const [note, setNote] = useState("");
  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(/android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : null);
  }, []);

  async function openAi(e, ai) {
    // Copy first (still inside the tap), so the prompt is ready to paste in the app.
    const copied = await copyText(prompt);
    if (copied) onCopied?.();
    if (!platform) return; // computer: the link opens the website (prompt pre-filled when it fits)

    e.preventDefault();
    setNote(copied ? `Prompt copied. Paste it in ${ai.name}.` : `Opening ${ai.name}…`);
    if (platform === "android") {
      window.location.href = androidLaunch(ai);
      return;
    }
    // iPhone: the app's own address when we know it, else the normal link (which may open the app).
    if (ai.ios) {
      window.location.href = ai.ios;
      // Still here after a moment = the app didn't open (not installed): use the website.
      setTimeout(() => {
        if (document.visibilityState === "visible") window.location.href = ai.home;
      }, 1500);
    } else {
      window.location.href = ai.home;
    }
  }

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs text-neutral-500">{platform ? "Open your AI app (the prompt is copied, just paste it):" : fits(prompt) ? "Or open it straight in:" : "Or open a chat (the prompt is copied, just paste it):"}</p>
      <div className="grid grid-cols-4 gap-2">
        {AIS.map((ai) => (
          <a
            key={ai.name}
            href={platform ? ai.home : ai.url(prompt)}
            target={platform ? undefined : "_blank"}
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
      {note && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" /> {note}
        </p>
      )}
      <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        <b className="font-semibold">Fastest:</b> in ChatGPT pick the <b>Instant</b> model (or tap <b>Skip</b> when it says <i>&ldquo;Thinking…&rdquo;</i>). Thinking mode can take 5+ minutes; Instant writes the whole plan in about 1–2.
      </p>
    </div>
  );
}
