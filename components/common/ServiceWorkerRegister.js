"use client";

import { useEffect } from "react";

// Registered in production only, so dev builds never serve stale cached assets.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      window.__fitmateInstall = e;
      window.dispatchEvent(new Event("fitmate:installable"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("SW registration failed", err));
  }, []);
  return null;
}
