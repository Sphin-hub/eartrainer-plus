/* Service worker: makes the app work offline.
 * `scripts/inject-sw.mjs` fills PRECACHE with every built file and a version after each build. */
const VERSION = '__VERSION__';
const PRECACHE = /*PRECACHE*/[];
const CACHE = `harmonic-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Pages: try the network (so updates arrive), fall back to the cached app shell when offline.
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // Files: cache first (built files have unique names), fill the cache as we go.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});
