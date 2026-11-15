/**
 * Ganoderma BSR Manager — service worker.
 *
 * No version number to bump. The app opens instantly from the cache (works
 * offline). On every launch, and whenever the app returns to the
 * foreground, the page sends "check".
 *
 * Updates are all-or-nothing, so an offline or flaky connection can never
 * leave a mix of new and old files:
 *   1. Download EVERY shell file past the HTTP cache into memory.
 *   2. If any download fails, stop — the live cache is not touched and no
 *      "updated" message is sent.
 *   3. If all succeeded and at least one file differs, write them all into
 *      a NEW cache (gbsr-shell-<timestamp>), add a completion marker last,
 *      make it the live cache, delete the older shells, then tell every
 *      open window "updated" so it can offer a reload.
 * The fetch handler only ever serves from the newest COMPLETE shell cache.
 * (Pattern adapted from the EM Brew Lab app.)
 */
'use strict';

const CACHE_PREFIX = 'gbsr-';         // everything this app owns
const SHELL_PREFIX = 'gbsr-shell-';   // complete app snapshots
const MARKER = './__shell-complete';  // written last into a finished snapshot
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

// The newest shell cache that contains the completion marker, or null.
// Cache Storage lists caches in creation order, so walk it backwards.
function liveCache() {
  return caches.keys().then((keys) => {
    const shells = keys.filter((k) => k.indexOf(SHELL_PREFIX) === 0).reverse();
    let i = 0;
    const next = () => {
      if (i >= shells.length) return null;
      const name = shells[i++];
      return caches.open(name).then((c) => c.match(MARKER).then((m) => (m ? { name, cache: c } : next())));
    };
    return next();
  });
}

// Download one file past the HTTP cache. Rejects on any failure so the
// whole update is abandoned.
function download(url) {
  return fetch(url, { cache: 'no-cache' }).then((res) => {
    if (!res || !res.ok) throw new Error('download failed: ' + url);
    return res.arrayBuffer().then((body) => ({
      url,
      body,
      headers: { 'content-type': res.headers.get('content-type') || '' }
    }));
  });
}

// Build a complete new snapshot. When `prune` is set, retire the older
// ones (only our own prefix — Cache Storage is shared by every app on the
// origin). While a new worker is still installing, the old worker may be
// serving pages from the old snapshot, so pruning then waits for activate.
function install(files, prune) {
  const name = SHELL_PREFIX + Date.now();
  return caches.open(name)
    .then((c) => Promise.all(files.map((f) => c.put(f.url, new Response(f.body, { headers: f.headers }))))
      .then(() => c.put(MARKER, new Response('ok'))))
    .then(() => (prune ? caches.keys().then((keys) => Promise.all(keys.map((k) =>
      (k.indexOf(CACHE_PREFIX) === 0 && k !== name ? caches.delete(k) : null)))) : null));
}

let inFlight = null;

// Resolves 'installed' (first complete snapshot), 'updated', 'same' or
// 'failed'. Concurrent calls share one run.
function checkForUpdate(prune) {
  if (inFlight) return inFlight;
  inFlight = Promise.all([Promise.all(SHELL.map(download)), liveCache()])
    .then(([files, live]) => {
      if (!live) return install(files, prune).then(() => 'installed');
      return Promise.all(files.map((f) => live.cache.match(f.url).then((old) =>
        old ? old.arrayBuffer().then((b) => !sameBytes(b, f.body)) : true
      ))).then((diff) => (diff.some(Boolean) ? install(files, prune).then(() => 'updated') : 'same'));
    })
    .catch(() => 'failed')
    .then((result) => { inFlight = null; return result; });
  return inFlight;
}

// install: build the first complete snapshot. If any file cannot be
// downloaded the install fails and the browser retries later — the page
// still works from the network meanwhile. An update check that finds an
// existing snapshot keeps it.
self.addEventListener('install', (e) => {
  e.waitUntil(checkForUpdate(false).then((r) => {
    if (r === 'failed') throw new Error('shell incomplete');
    return self.skipWaiting();
  }));
});

// activate: drop this app's caches that are not a complete snapshot
// (including the old versioned gbsr-cache-… and gbsr-shell caches), then
// take control. Only caches with our own prefix are touched.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    liveCache()
      .then((live) => caches.keys().then((keys) => Promise.all(keys.map((k) =>
        (k.indexOf(CACHE_PREFIX) === 0 && (!live || k !== live.name) ? caches.delete(k) : null)))))
      .then(() => self.clients.claim())
  );
});

// fetch: navigations → the live snapshot's index.html; same-origin →
// the live snapshot, else network; cross-origin → left alone.
// Responses fetched here are NOT added to the snapshot, so it never mixes
// versions. Freshness comes from the "check" message.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  const key = req.mode === 'navigate' ? INDEX : req;
  e.respondWith(
    liveCache()
      .then((live) => (live ? live.cache.match(key, { ignoreSearch: true }) : null))
      .then((hit) => hit || fetch(req))
  );
});

// "check" from a page: if a complete newer snapshot was installed, tell
// every open window so each can offer a reload.
self.addEventListener('message', (e) => {
  if (e.data !== 'check') return;
  e.waitUntil(checkForUpdate(true).then((result) => {
    if (result !== 'updated') return;
    return self.clients.matchAll({ type: 'window' }).then((list) => list.forEach((c) => c.postMessage('updated')));
  }));
});
