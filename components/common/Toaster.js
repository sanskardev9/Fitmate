"use client";

import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToasts, dismiss } from "@/lib/toast";

const STYLE = {
  success: { Icon: CheckCircle2, ring: "ring-emerald-500/30", icon: "text-emerald-500", bar: "bg-emerald-500" },
  error: { Icon: XCircle, ring: "ring-rose-500/30", icon: "text-rose-500", bar: "bg-rose-500" },
  info: { Icon: Info, ring: "ring-sky-500/30", icon: "text-sky-500", bar: "bg-sky-500" },
};

// Toasts slide in at the top (under the notch), stack, and disappear on their own.
export default function Toaster() {
  const toasts = useToasts();
  if (!toasts.length) return null;
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const s = STYLE[t.kind] ?? STYLE.info;
        return (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className={`toast-in pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-2xl bg-white/95 py-3 pr-2 pl-4 shadow-2xl ring-1 backdrop-blur-xl dark:bg-neutral-900/95 ${s.ring}`}>
            <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} />
            <s.Icon className={`h-5 w-5 shrink-0 ${s.icon}`} />
            <p className="min-w-0 flex-1 text-sm font-medium">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
