"use client";

// Shown above "paste the reply": the AI needs a couple of minutes to write a full plan.
export default function AiWaitHint({ minutes = "2–3" }) {
  return (
    <p className="mb-2 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
      <span className="flex shrink-0 gap-0.5" aria-hidden="true">
        {[0, 150, 300].map((d) => (
          <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: `${d}ms` }} />
        ))}
      </span>
      The AI takes about {minutes} minutes to write the full plan. Wait until it finishes, then tap Copy on the code block.
    </p>
  );
}
