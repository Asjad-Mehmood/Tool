// ToolHub service worker. Static assets are cached so in-browser PDF tools keep working offline once visited.
// Never caches /api, auth, dashboard, or any non-GET request.
const VERSION = "v1", STATIC = `static-${VERSION}`, PAGES = `pages-${VERSION}`;
const SKIP = [/^\/api\//, /^\/login/, /^\/dashboard/];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(PAGES).then((c) => c.add("/offline")).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || SKIP.some((r) => r.test(url.pathname))) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) { // immutable assets: cache first
    e.respondWith(caches.open(STATIC).then(async (c) => (await c.match(req)) ?? fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  if (req.mode === "navigate") { // pages: network first, fall back to cache, then the offline page
    e.respondWith(fetch(req).then((r) => { if (r.ok) caches.open(PAGES).then((c) => c.put(req, r.clone())); return r; }).catch(async () => (await caches.match(req)) ?? (await caches.match("/offline")) ?? Response.error()));
  }
});
