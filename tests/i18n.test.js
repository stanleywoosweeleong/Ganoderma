'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../js/i18n.js');
const G = require('../js/core.js');

test('i18n: every string has en, ms and zh', () => {
  for (const [key, e] of Object.entries(I.STRINGS)) {
    for (const l of ['en', 'ms', 'zh']) assert.ok(e[l] && e[l].trim(), `${key} missing ${l}`);
  }
});

test('i18n: every step and warning a plan can produce is translated', () => {
  const plans = [
    ...[0, 1, 2, 3, 4].map(stage => G.buildPlan({ setting: 'mature', stage, startDate: '2027-01-04' })),
    G.buildPlan({ setting: 'replant', startDate: '2027-01-04' }),
    G.buildPlan({ setting: 'nursery', startDate: '2027-01-04' })
  ];
  for (const p of plans) {
    p.warnings.forEach(w => assert.ok(I.STRINGS[w], 'missing ' + w));
    p.batches.forEach(b => b.steps.forEach(s => assert.ok(I.STRINGS['step.' + s], 'missing step.' + s)));
  }
});

test('i18n: stage names and evidence levels are translated', () => {
  G.STAGES.forEach(s => assert.ok(I.STRINGS['stage.' + s.key]));
  G.EVIDENCE.forEach(e => assert.ok(I.STRINGS['ev.level.' + e.level]));
});

test('i18n: parameters are substituted and language switch works', () => {
  I.setLang('zh');
  assert.equal(I.t('plan.batch', { n: 3 }), '第 3 批');
  I.setLang('ms');
  assert.equal(I.t('plan.week', { n: 4 }), 'Minggu 4');
  I.setLang('xx'); // ignored
  assert.equal(I.getLang(), 'ms');
  I.setLang('en');
  assert.equal(I.t('no.such.key'), 'no.such.key');
});

test('i18n: every error code from core.js has a translated message', () => {
  G.ERROR_CODES.forEach(c => assert.ok(I.STRINGS['err.' + c], 'missing err.' + c));
});

test('core errors carry a code and value for translation', () => {
  let e;
  try { G.buildPlan({ setting: 'nursery', startDate: 'bad' }); } catch (x) { e = x; }
  assert.equal(e.code, 'date');
  assert.equal(e.value, 'bad');
  try { G.planBrews(G.buildPlan({ setting: 'nursery', startDate: '2027-01-04' }), 0); } catch (x) { e = x; }
  assert.equal(e.code, 'palms');
  assert.ok(G.ERROR_CODES.includes(e.code));
  I.setLang('zh');
  assert.equal(I.t('err.date', { v: 'bad' }), '日期无效:"bad"。请使用 年-月-日 格式,例如 2027-02-15。');
  I.setLang('en');
});

test('safety: P. aeruginosa product and plan steps carry a translated safety note', () => {
  const p = G.PRODUCTS.find(x => x.id === 'im_bioguard');
  assert.equal(p.safety, 'pseudomonas');
  const e = I.STRINGS['safety.pseudomonas'];
  for (const l of ['en', 'ms', 'zh']) assert.match(e[l], /Pseudomonas aeruginosa|铜绿假单胞菌/);
  // every plan that uses a bacterial step exists in both forms the UI attaches the note to
  const steps = new Set();
  [0, 1, 2].forEach(stage => G.buildPlan({ setting: 'mature', stage, startDate: '2027-01-04' }).batches.forEach(b => b.steps.forEach(s => steps.add(s))));
  G.buildPlan({ setting: 'nursery', startDate: '2027-01-04' }).batches.forEach(b => b.steps.forEach(s => steps.add(s)));
  assert.ok(steps.has('bact.drench') && steps.has('bact.drench.nursery'));
});
