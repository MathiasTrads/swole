/* Swole service worker: offline shell + push reminders */
const CACHE = "swole-v36";
const SHELL = [
  "./", "index.html", "plan.js?v=36", "locker.js?v=36", "social.js?v=36", "gen.js?v=36", "sb.js?v=36", "draw.js?v=36", "path.js?v=36", "app.js?v=36", "onboarding.js?v=36", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "fonts/TerzaDisplay-Regular.woff2?v=36", "fonts/Metrim-Regular.woff2?v=36", "media/cut-default.webp", "media/cut-ready.webp", "media/cut-bench.webp", "media/cut-recover.webp",
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;   // GitHub API, fonts: straight to network
  if (url.pathname.endsWith(".mp4")) return;                                  // let Safari handle video range requests
  // network first, so updates land immediately; cache as fallback for offline
  e.respondWith(
    fetch(e.request, {cache: "no-cache"}).then(res => {
      if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch(err){ d = {body: e.data && e.data.text()}; }
  e.waitUntil(self.registration.showNotification(d.title || "Swole", {
    body: d.body || "Check in first. Then I'll know what you've got today.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: d.tag || "swole-morning",
    data: {url: d.url || "./"},
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(list => {
    for (const c of list){ if ("focus" in c) return c.focus(); }
    return self.clients.openWindow(e.notification.data.url || "./");
  }));
});
