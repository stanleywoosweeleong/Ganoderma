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
