"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { TriangleAlert, Trash2, CircleHelp } from "lucide-react";

// App-styled replacement for window.confirm:
//   const confirm = useConfirm();
//   if (await confirm({ title, message, confirmLabel, tone: "danger" })) { ... }
const ConfirmContext = createContext(async () => false);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setDialog({ confirmLabel: "Confirm", cancelLabel: "Cancel", tone: "default", ...opts });
      }),
    [],
  );

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <Dialog {...dialog} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

function Dialog({ title, message, confirmLabel, cancelLabel, tone, onClose }) {
  const confirmRef = useRef(null);
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const danger = tone === "danger";
  const Icon = danger ? Trash2 : tone === "warn" ? TriangleAlert : CircleHelp;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => onClose(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-fade-up w-full max-w-sm rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${danger ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <h2 id="confirm-title" className="mt-4 text-lg font-semibold">
          {title}
        </h2>
        {message && <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{message}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onClose(false)} className="rounded-xl border border-neutral-300 py-3 font-medium dark:border-neutral-700">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className={`rounded-xl py-3 font-semibold text-white ${danger ? "bg-red-600 active:bg-red-700" : "bg-emerald-600 active:bg-emerald-700"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
