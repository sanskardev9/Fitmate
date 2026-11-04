// FitMate service worker: caches the app shell and static assets for offline use.
// User data lives in IndexedDB and is never touched here.
const CACHE = "fitmate-v10";
const SHELL = [
  "/",
  "/home",
  "/login",
  "/tracker",
  "/workout",
  "/diet",
  "/progress",
  "/plans",
  "/plans/workout/new",
  "/plans/diet/new",
  "/plans/import",
  "/manifest.webmanifest",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  // Local dev: nothing to precache. Elsewhere, cache each page on its own so one slow or
  // failing page never blocks the worker (and notifications) from installing.
  const precache = self.location.hostname === "localhost" ? Promise.resolve() : caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))));
  event.waitUntil(precache.then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Local dev: never serve cached files (the worker is only there for notifications).
  if (self.location.hostname === "localhost") return;
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Pages: network first so updates land, cached copy when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  // Hashed build assets and static files: cache first.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});

// ---- Notifications ----------------------------------------------------------------------
// Reports a delivery step to the server (see push_events), so we can see where a push stops.
function track(pid, stage, detail) {
  return self.registration.pushManager
    .getSubscription()
    .then((sub) =>
      fetch("/api/push/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid, stage, detail, endpoint: sub?.endpoint }),
        keepalive: true,
      }),
    )
    .catch(() => {});
}

// Push from the server (workout and streak reminders, admin messages).
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { body: event.data?.text() };
  }
  const perm = self.Notification?.permission ?? "unknown";
  event.waitUntil(
    track(d.pid, "received", `permission: ${perm}`)
      .then(() => self.registration.showNotification(d.title || "Reminder", {
        body: d.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        // Android / Windows: big picture card and buttons (others ignore what they don't support).
        image: d.image || undefined,
        actions: Array.isArray(d.actions) ? d.actions.slice(0, 2) : undefined,
        requireInteraction: Boolean(d.requireInteraction),
        timestamp: Date.now(),
        vibrate: [120, 60, 120],
        data: { url: d.url || "/home", pid: d.pid, payload: { title: d.title, body: d.body, url: d.url, image: d.image, kind: d.kind } },
      }))
      .then(
        () => track(d.pid, "shown", "handed to the operating system; if no banner appeared, the OS or Focus mode hid it"),
        (e) => track(d.pid, "show_failed", String(e && e.message ? e.message : e)),
      )
      // Tell any open FitMate page it arrived (Profile uses this to explain a hidden banner).
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((list) => list.forEach((c) => c.postMessage({ type: "fitmate:push", tag: d.tag, title: d.title }))),
  );
});

// Tapping a notification focuses an open FitMate window (moving it to the page) or opens one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  // "In 1 hour": ask the server to send it again later; don't open the app.
  if (event.action === "snooze") {
    event.waitUntil(
      self.registration.pushManager.getSubscription().then((sub) =>
        fetch("/api/push/snooze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub && sub.endpoint, pid: data.pid, payload: data.payload }),
        }).catch(() => {}),
      ),
    );
    return;
  }
  track(data.pid, "clicked", event.action ? `button: ${event.action}` : "notification");
  const url = new URL(event.notification.data?.url || "/home", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).origin === self.location.origin);
      if (open) return open.focus().then((c) => (c && "navigate" in c ? c.navigate(url) : c));
      return self.clients.openWindow(url);
    }),
  );
});
