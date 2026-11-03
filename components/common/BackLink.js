"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "./ConfirmDialog";

// "← Back" to the page that opened this one (?return=…), falling back to `fallback`.
// `dirty` asks before leaving with unsaved changes.
export default function BackLink({ fallback = "/plans", dirty = false, label = "Back" }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [target, setTarget] = useState(fallback);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("return");
    if (r?.startsWith("/")) setTarget(r);
  }, []);

  return (
    <button
      type="button"
      onClick={async () => {
        if (dirty && !(await confirm({ title: "Leave without saving?", message: "Your changes to this plan will be lost.", confirmLabel: "Leave", tone: "warn" }))) return;
        router.push(target);
      }}
      className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 10H4M9 5l-5 5 5 5" />
      </svg>
      {label}
    </button>
  );
}
