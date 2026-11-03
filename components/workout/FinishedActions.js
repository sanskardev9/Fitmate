"use client";

import { useRouter } from "next/navigation";
import { Play, RotateCcw } from "lucide-react";
import { reopenSession, restartSession } from "@/lib/services/sessionService";
import { useConfirm } from "@/components/common/ConfirmDialog";

// For a workout that was ended today: carry on where it stopped, or start it again from set 1.
export default function FinishedActions({ session, setsDone = 0, compact = false, single = false }) {
  const router = useRouter();
  const confirm = useConfirm();
  const size = compact ? "px-3 py-2 text-sm" : "flex-1 py-3 text-sm";

  // One clear action when nothing is logged (or the day was closed): reopen it, keeping any sets.
  if (single || setsDone === 0)
    return (
      <button
        type="button"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await reopenSession(session.id);
          router.push("/session");
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 font-semibold text-white active:bg-emerald-700"
      >
        <Play className="h-4 w-4 fill-current" /> Start workout
      </button>
    );

  return (
    <div className={`flex gap-2 ${compact ? "" : "mt-4"}`}>
      <button
        type="button"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await reopenSession(session.id);
          router.push("/session");
        }}
        className={`flex items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white active:bg-emerald-700 ${size}`}
      >
        <Play className="h-4 w-4 fill-current" /> Continue
      </button>
      <button
        type="button"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const ok =
            !setsDone ||
            (await confirm({
              title: "Start this workout over?",
              message: `The ${setsDone} set${setsDone === 1 ? "" : "s"} you logged in it will be cleared and you'll start again from set 1.`,
              confirmLabel: "Start over",
              tone: "warn",
            }));
          if (!ok) return;
          await restartSession(session);
          router.push("/session");
        }}
        className={`flex items-center justify-center gap-2 rounded-xl border border-neutral-300 font-semibold dark:border-neutral-700 ${size}`}
      >
        <RotateCcw className="h-4 w-4" /> Start over
      </button>
    </div>
  );
}
