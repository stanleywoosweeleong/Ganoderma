'use strict';
// Runs service-worker.js in a Node vm with an in-memory Cache Storage and
// a scripted network, so update behaviour is tested in CI without a browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ORIGIN = 'https://example.test/app/';
const SRC = fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8');
const abs = (u) => new URL(typeof u === 'string' ? u : u.url, ORIGIN).href;

function makeEnv(files) {
  // network: url -> { status, body }
  const net = new Map(Object.entries(files).map(([k, v]) => [abs(k), { status: 200, body: v }]));
  const stores = new Map(); // cache name -> Map(url -> body string)
  const messages = [];
  let clock = 1000;

  const cacheApi = (map) => ({
    match: (req) => Promise.resolve(map.has(abs(req)) ? new Response(map.get(abs(req))) : undefined),
    put: (req, res) => res.text().then((t) => { map.set(abs(req), t); })
  });
  const caches = {
    open: (name) => { if (!stores.has(name)) stores.set(name, new Map()); return Promise.resolve(cacheApi(stores.get(name))); },
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (name) => Promise.resolve(stores.delete(name))
  };
  const listeners = {};
  const self = {
    location: new URL('service-worker.js', ORIGIN),
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: () => Promise.resolve(),
    clients: {
      claim: () => Promise.resolve(),
      matchAll: () => Promise.resolve([{ postMessage: (m) => messages.push(m) }])
    }
  };
  const fetch = (req) => {
    const r = net.get(abs(req));
    if (!r) return Promise.reject(new TypeError('offline'));
    return Promise.resolve(new Response(r.body, { status: r.status }));
  };
  const ctx = vm.createContext({
    self, caches, fetch, Response, URL, Uint8Array, Promise, console,
    Date: { now: () => ++clock }
  });
  vm.runInContext(SRC, ctx);

  async function fire(type, extra) {
    let p = Promise.resolve();
    let responded;
    listeners[type](Object.assign({ waitUntil: (x) => { p = x; }, respondWith: (x) => { responded = x; } }, extra));
    await p;
    return responded;
  }
  return {
    net, stores, messages, listeners,
    install: () => fire('install'),
    activate: () => fire('activate'),
    check: () => fire('message', { data: 'check' }),
    get: async (url, mode) => {
      const res = await fire('fetch', { request: { method: 'GET', url: abs(url), mode: mode || 'no-cors' } });
      return res ? (await res).text() : null;
    },
    shellCaches: () => [...stores.keys()].filter((k) => k.startsWith('gbsr-shell-'))
  };
}

const V1 = {
  './index.html': 'html-v1', './manifest.json': '{}', './js/core.js': 'core-v1',
  './js/i18n.js': 'i18n-v1', './js/app.js': 'app-v1', './icon-192.png': 'png', './icon-512.png': 'png'
};

async function installed() {
  const env = makeEnv(V1);
  await env.install();
  await env.activate();
  return env;
}

test('sw: install builds one complete snapshot and serves from it', async () => {
  const env = await installed();
  assert.equal(env.shellCaches().length, 1);
  assert.equal(await env.get('./', 'navigate'), 'html-v1');
  assert.equal(await env.get('./js/core.js'), 'core-v1');
});

test('sw: unchanged server → no new snapshot, no "updated"', async () => {
  const env = await installed();
  await env.check();
  assert.deepEqual(env.messages, []);
  assert.equal(env.shellCaches().length, 1);
});

test('sw: new HTML but JS download fails → nothing changes, no notice (review P1)', async () => {
  const env = await installed();
  env.net.set(abs('./index.html'), { status: 200, body: 'html-v2' });
  env.net.set(abs('./js/core.js'), { status: 503, body: 'ERROR PAGE' });
  await env.check();
  assert.deepEqual(env.messages, [], 'no update notice');
  assert.equal(await env.get('./', 'navigate'), 'html-v1', 'old HTML still served');
  assert.equal(await env.get('./js/core.js'), 'core-v1', 'old JS still served');
});

test('sw: offline mid-update (file missing) → old version kept', async () => {
  const env = await installed();
  env.net.set(abs('./index.html'), { status: 200, body: 'html-v2' });
  env.net.delete(abs('./js/app.js'));
  await env.check();
  assert.deepEqual(env.messages, []);
  assert.equal(await env.get('./js/app.js'), 'app-v1');
});

test('sw: complete update → "updated", new HTML and new JS together, old snapshot removed', async () => {
  const env = await installed();
  env.net.set(abs('./index.html'), { status: 200, body: 'html-v2' });
  env.net.set(abs('./js/core.js'), { status: 200, body: 'core-v2' });
  await env.check();
  assert.deepEqual(env.messages, ['updated']);
  assert.equal(await env.get('./', 'navigate'), 'html-v2');
  assert.equal(await env.get('./js/core.js'), 'core-v2');
  assert.equal(await env.get('./js/app.js'), 'app-v1', 'unchanged files carried over');
  assert.equal(env.shellCaches().length, 1);
});

test('sw: a JS-only change is also offered as an update', async () => {
  const env = await installed();
  env.net.set(abs('./js/i18n.js'), { status: 200, body: 'i18n-v2' });
  await env.check();
  assert.deepEqual(env.messages, ['updated']);
  assert.equal(await env.get('./js/i18n.js'), 'i18n-v2');
});

test('sw: install fails when the shell cannot be fully downloaded', async () => {
  const env = makeEnv(V1);
  env.net.set(abs('./js/app.js'), { status: 404, body: 'nf' });
  await assert.rejects(env.install());
  assert.equal(env.shellCaches().length, 0);
});

test('sw: other apps\' caches on the same origin survive; old versioned caches go', async () => {
  const env = makeEnv(V1);
  await (await env.stores.set('other-app-v3', new Map()), Promise.resolve());
  env.stores.set('gbsr-cache-gbsr-2026-11-15a', new Map());
  env.stores.set('gbsr-shell', new Map()); // previous fixed-name cache, no marker
  await env.install();
  await env.activate();
  assert.ok(env.stores.has('other-app-v3'));
  assert.ok(!env.stores.has('gbsr-cache-gbsr-2026-11-15a'));
  assert.ok(!env.stores.has('gbsr-shell'));
  assert.equal(env.shellCaches().length, 1);
});

test('sw: an incomplete snapshot (no marker) is never served', async () => {
  const env = await installed();
  // simulate a crash half-way through writing a newer snapshot
  env.stores.set('gbsr-shell-999999', new Map([[abs('./index.html'), 'html-half']]));
  assert.equal(await env.get('./', 'navigate'), 'html-v1');
});
