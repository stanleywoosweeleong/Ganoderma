'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('service worker caches every local script and icon index.html loads', () => {
  const html = read('index.html');
  const sw = read('service-worker.js');
  const local = [...html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|json|png))"/g)].map(m => m[1]);
  assert.ok(local.length >= 4);
  for (const f of new Set(local)) assert.ok(sw.includes(`'./${f}'`), `service-worker.js SHELL is missing ./${f}`);
});

test('service worker has no manual version to bump and answers "check"', () => {
  const sw = read('service-worker.js');
  assert.ok(!/CACHE_VERSION/.test(sw));
  assert.match(sw, /e\.data !== 'check'/);
  assert.match(sw, /postMessage\('updated'\)/);
});

test('first-launch language picker offers exactly en, ms and zh', () => {
  const html = read('index.html');
  const pick = html.slice(html.indexOf('id="langpick"'), html.indexOf('</div>', html.indexOf('id="langpick"')));
  const langs = [...pick.matchAll(/data-lang="(\w+)"/g)].map(m => m[1]).sort();
  assert.deepEqual(langs, ['en', 'ms', 'zh']);
});
