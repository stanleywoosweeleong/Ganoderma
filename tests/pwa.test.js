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

test('header language toggle offers en, ms and zh as pressable buttons', () => {
  const html = read('index.html');
  const start = html.indexOf('id="langs"');
  const block = html.slice(start, html.indexOf('</div>', start));
  const langs = [...block.matchAll(/class="langbtn"[^>]*data-lang="(\w+)"/g)].map(m => m[1]);
  assert.deepEqual(langs, ['en', 'zh', 'ms'], 'Chinese second (more Chinese readers)');
  assert.ok(!/<select id="lang"/.test(html), 'old dropdown removed');
});

test('first-launch picker order is English, 中文, Bahasa Melayu', () => {
  const html = read('index.html');
  const start = html.indexOf('id="langpick"');
  const block = html.slice(start, html.indexOf('</div>', start));
  assert.deepEqual([...block.matchAll(/data-lang="(\w+)"/g)].map(m => m[1]), ['en', 'zh', 'ms']);
});

test('back-to-top button exists, starts hidden and has a translated label', () => {
  const html = read('index.html');
  assert.match(html, /<button[^>]*id="totop"[^>]*data-i18n-aria="totop"[^>]*hidden>/);
});

test('light mode only: no dark colour scheme rules', () => {
  const html = read('index.html');
  assert.ok(!/prefers-color-scheme:\s*dark/.test(html));
  assert.ok(!/data-theme="dark"/.test(html));
  assert.match(html, /<meta name="color-scheme" content="light">/);
});

test('tabs are numbered as protocol steps 1–4 and the first screen links all four', () => {
  const html = read('index.html');
  const nums = [...html.matchAll(/data-tab="(\w+)"[^>]*><span class="stepno">(\d)<\/span>/g)].map(m => m[1] + m[2]);
  assert.deepEqual(nums, ['assess1', 'plan2', 'brew3', 'track4']);
  assert.deepEqual([...html.matchAll(/data-go="(\w+)"/g)].map(m => m[1]), ['assess', 'plan', 'brew', 'track']);
});

test('phones get a fixed bottom tab bar with five equal columns', () => {
  const html = read('index.html');
  const m = html.match(/@media \(max-width: 640px\) \{([\s\S]*?)\n  \}/);
  assert.ok(m, 'mobile media block');
  assert.match(m[1], /nav \{ position: fixed;[^}]*bottom: 0/);
  assert.match(m[1], /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(html, /data-tab="evidence"[^>]*><span class="stepno evi"/);
});
