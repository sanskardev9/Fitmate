"use client";

import { copyText } from "./PlanImport";

// Open the prompt in an AI chat. Official https links: on phones they open the installed app
// (iOS universal links / Android app links), otherwise the website. The prompt is copied first;
// ChatGPT and Claude websites also receive it pre-filled.
const AIS = [
  { name: "ChatGPT", domain: "chatgpt.com", url: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}` },
  { name: "Claude", domain: "claude.ai", url: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}` },
  { name: "Gemini", domain: "gemini.google.com", url: () => "https://gemini.google.com/app" },
  { name: "Perplexity", domain: "perplexity.ai", url: (p) => `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}` },
];

export default function AiLinks({ prompt, onCopied }) {
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs text-neutral-500">Or open it straight in:</p>
      <div className="grid grid-cols-4 gap-2">
        {AIS.map((ai) => (
          <a
            key={ai.name}
            href={ai.url(prompt)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => copyText(prompt).then((ok) => ok && onCopied?.())}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 py-2.5 text-[11px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 active:scale-95 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://www.google.com/s2/favicons?domain=${ai.domain}&sz=64`} alt="" width={28} height={28} className="h-7 w-7 rounded-lg" loading="lazy" />
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
