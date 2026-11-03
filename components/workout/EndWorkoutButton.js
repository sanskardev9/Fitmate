"use client";

import { Square } from "lucide-react";
import { finishSession } from "@/lib/services/sessionService";
import { skipRest } from "@/lib/workout/restTimer";
import { useConfirm } from "@/components/common/ConfirmDialog";

// Ends an in-progress workout from outside workout mode (logged sets are kept).
export default function EndWorkoutButton({ sessionId, className = "" }) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await confirm({ title: "End this workout?", message: "Sets you logged are saved. Sets you didn't log count as skipped.", confirmLabel: "End workout", tone: "warn" });
        if (!ok) return;
        await finishSession(sessionId, {});
        skipRest();
      }}
      className={`flex items-center justify-center gap-1.5 rounded-xl font-semibold ${className}`}
    >
      <Square className="h-3.5 w-3.5 fill-current" /> End
    </button>
  );
}
