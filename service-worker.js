/**
 * Ganoderma BSR Manager — service worker.
 *
 * No version number to bump. The app opens instantly from the cache (works
 * offline). On every launch, and whenever the app returns to the
 * foreground, the page sends "check": every shell file is re-fetched past
 * the HTTP cache, the cache is refreshed, and if any file came back
 * different every open window is told "updated" so it can offer a reload.
 * (Pattern taken from the EM Brew Lab app.)
 */
'use strict';

const CACHE_PREFIX = 'gbsr-';
const CACHE = 'gbsr-shell';
const INDEX = './index.html';

// Keep in sync with the files index.html loads (a test checks this).
const SHELL = [
  INDEX,
  './manifest.json',
  './js/core.js',
  './js/i18n.js',
  './js/app.js',
  './icon-192.png',
  './icon-512.png'
];

function sameBytes(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a), y = new Uint8Array(b);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}

// Fetch one file past the HTTP cache and store it. Resolves true only when
// a copy was already cached and the new one differs. Errors and non-200
// responses leave the cache untouched.
function refresh(url) {
  return fetch(url, { cache: 'no-cache' }).then((res) => {
    if (!res || !res.ok) return false;
    return caches.open(CACHE).then((c) => c.match(url).then((old) =>
      Promise.all([old ? old.arrayBuffer() : null, res.clone().arrayBuffer()]).then((b) => {
        const changed = !!b[0] && !sameBytes(b[0], b[1]);
        return c.put(url, res).then(() => changed);
      })
    ));
  }).catch(() => false);
}

function refreshShell() {
  return Promise.all(SHELL.map(refresh)).then((changed) => changed.some(Boolean));
}

// install: precache the shell and take over straight away — the cache name
// never changes, so a new worker is always safe to activate.
self.addEventListener('install', (e) => {
  e.waitUntil(refreshShell().then(() => self.skipWaiting()));
});

// activate: drop this app's older versioned caches (gbsr-cache-…), then
// take control. Only caches with our own prefix are touched.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE ? caches.delete(k) : null))))
      .then(() => self.clients.claim())
  );
});

// fetch: navigations → cached app instantly; same-origin → cache first;
// cross-origin → left alone. Freshness comes from the "check" message.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(caches.match(INDEX).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(INDEX, copy)); }
      return res;
    })));
    return;
  }

  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res && res.status === 200 && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});

// "check" from a page: refresh the shell; if anything changed, tell every
// open window so each can offer a reload.
self.addEventListener('message', (e) => {
  if (e.data !== 'check') return;
  e.waitUntil(refreshShell().then((changed) => {
    if (!changed) return;
    return self.clients.matchAll({ type: 'window' }).then((list) => list.forEach((c) => c.postMessage('updated')));
  }));
});
