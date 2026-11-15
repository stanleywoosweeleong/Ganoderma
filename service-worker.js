/**
 * Ganoderma BSR Manager — service worker.
 * Stale-while-revalidate: serve cached files instantly (works offline),
 * refresh them in the background, and tell the page when index.html changed.
 * Bump CACHE_VERSION whenever you ship new files.
 */
const CACHE_VERSION = 'gbsr-2026-11-15e';
const CACHE_NAME = `gbsr-cache-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './js/core.js',
  './js/i18n.js',
  './js/app.js',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gbsr-cache-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then(async (res) => {
      if (res && res.ok) {
        if (cached && req.mode === 'navigate') {
          const [a, b] = await Promise.all([cached.clone().text(), res.clone().text()]);
          if (a !== b) notifyClients();
        }
        await cache.put(req, res.clone());
      }
      return res;
    }).catch(() => cached);
    if (cached) { event.waitUntil(network); return cached; }
    return network;
  }));
});

async function notifyClients() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) => c.postMessage({ type: 'UPDATE_AVAILABLE' }));
}
