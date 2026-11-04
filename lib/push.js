"use client";

import { supabase } from "@/lib/supabase/client";

// Browser side of notifications: permission, this device's push subscription, local alerts.

export function pushSupport() {
  if (typeof window === "undefined") return { ok: false };
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const iosVersion = ios ? parseFloat((navigator.userAgent.match(/OS (\d+)_(\d+)/) ?? []).slice(1).join(".")) || null : null;
  // Why it can't work here, most useful first.
  const reason = ok
    ? null
    : !window.isSecureContext
      ? "insecure" // http:// (e.g. a computer's Wi-Fi address): browsers only allow notifications on https
      : ios && iosVersion && iosVersion < 16.4
        ? "old-ios"
        : ios && !standalone
          ? "install"
          : "browser";
  // iPhone/iPad only allow web push once FitMate is added to the Home Screen.
  return { ok, ios, standalone, reason, needsInstall: reason === "install" };
}

export async function isBrave() {
  try {
    return Boolean(await navigator.brave?.isBrave?.());
  } catch {
    return false;
  }
}

export const permission = () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);

// Makes sure the newest worker (with the latest push handling) is running.
export async function refreshWorker() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
  } catch {}
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) {
    existing.update().catch(() => {});
    return existing;
  }
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

async function authed(path, method, body) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong.");
  return json;
}

function keyBytes(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  if (!pushSupport().ok) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

// Must be called from a tap: asks for permission, subscribes this device and saves it.
export async function enablePush() {
  const support = pushSupport();
  if (!support.ok) throw new Error("This browser can't show notifications.");
  const result = await Notification.requestPermission();
  if (result !== "granted") trackSetup("permission_denied", `permission: ${result}`);
  if (result !== "granted") throw new Error(result === "denied" ? "Notifications are blocked for FitMate in your browser settings." : "Notifications weren't allowed.");
  const reg = await registration();
  let sub;
  try {
    sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) }));
  } catch (e) {
    trackSetup("subscribe_failed", `${e.name}: ${e.message}`);
    // Brave turns off the push service Chromium browsers use, so subscribing fails with "push service error".
    if (await isBrave()) {
      const err = new Error("Brave has push notifications switched off. Open brave://settings/privacy, turn on “Use Google services for push messaging”, restart Brave and try again.");
      err.brave = true;
      throw err;
    }
    throw new Error(`Your browser couldn't set up notifications (${e.message || "push service error"}). Try Chrome, Edge, Firefox or Safari.`);
  }
  await authed("/api/push/subscribe", "POST", { subscription: sub.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  trackSetup("subscribed", `permission: ${Notification.permission}`);
  return sub;
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await authed("/api/push/subscribe", "DELETE", { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}

export const sendTestPush = () => authed("/api/push/test", "POST");

// Setup steps for the delivery log (never throws).
export const trackSetup = (stage, detail) => authed("/api/push/event", "POST", { stage, detail: String(detail ?? "").slice(0, 400) || undefined }).catch(() => {});

// Local alert from the app itself (rest timer), shown only when FitMate isn't on screen.
export async function localNotify(title, body, { tag, url = "/workout" } = {}) {
  try {
    if (permission() !== "granted" || localStorage.getItem("fitmate:restNotify") === "0") return;
    if (document.visibilityState === "visible") return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, renotify: true, icon: "/icons/icon-192.png", badge: "/icons/badge-96.png", data: { url }, requireInteraction: false });
    else new Notification(title, { body, tag });
  } catch {}
}
