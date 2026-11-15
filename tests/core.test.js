'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/core.js');

// ── classifyPalm ──────────────────────────────────────────────────────────
test('classifyPalm: no symptoms is healthy (0)', () => {
  assert.equal(G.classifyPalm({}), 0);
  assert.equal(G.classifyPalm({ lesionPct: 0, foliar: 'none' }), 0);
});

test('classifyPalm: fruiting body alone is early (1)', () => {
  assert.equal(G.classifyPalm({ fruitingBody: true }), 1);
});

test('classifyPalm: small lesion is early, 20% lesion is moderate', () => {
  assert.equal(G.classifyPalm({ lesionPct: 5 }), 1);
  assert.equal(G.classifyPalm({ lesionPct: 19.9 }), 1);
  assert.equal(G.classifyPalm({ lesionPct: 20 }), 2);
});

test('classifyPalm: mild foliar symptoms are moderate (2)', () => {
  assert.equal(G.classifyPalm({ foliar: 'mild' }), 2);
});

test('classifyPalm: severe foliar or ≥50% lesion is severe (3)', () => {
  assert.equal(G.classifyPalm({ foliar: 'severe' }), 3);
  assert.equal(G.classifyPalm({ lesionPct: 50, fruitingBody: true }), 3);
});

test('classifyPalm: dead overrides everything (4)', () => {
  assert.equal(G.classifyPalm({ dead: true, lesionPct: 0 }), 4);
});

test('classifyPalm: rejects out-of-range input', () => {
  assert.throws(() => G.classifyPalm({ lesionPct: -1 }), RangeError);
  assert.throws(() => G.classifyPalm({ lesionPct: 101 }), RangeError);
  assert.throws(() => G.classifyPalm({ foliar: 'yellow' }), RangeError);
});

// ── summariseCensus ───────────────────────────────────────────────────────
test('summariseCensus: incidence and DSI', () => {
  // 100 palms: 70 healthy, 10 early, 10 moderate, 5 severe, 5 dead
  const s = G.summariseCensus([70, 10, 10, 5, 5]);
  assert.equal(s.n, 100);
  assert.equal(s.infected, 30);
  assert.equal(s.incidence, 30);
  // Σ = 10*1 + 10*2 + 5*3 + 5*4 = 65 ; 65 / (4*100) * 100 = 16.25
  assert.equal(s.dsi, 16.25);
});

test('summariseCensus: all dead = 100% DSI, all healthy = 0%', () => {
  assert.equal(G.summariseCensus([0, 0, 0, 0, 12]).dsi, 100);
  assert.equal(G.summariseCensus([12, 0, 0, 0, 0]).dsi, 0);
});

test('summariseCensus: empty block returns nulls', () => {
  const s = G.summariseCensus([0, 0, 0, 0, 0]);
  assert.equal(s.incidence, null);
  assert.equal(s.dsi, null);
});

test('summariseCensus: validates counts', () => {
  assert.throws(() => G.summariseCensus([1, 2, 3]), RangeError);
  assert.throws(() => G.summariseCensus([1, 2, 3, 4, -1]), RangeError);
  assert.throws(() => G.summariseCensus([1, 2, 3, 4, 0.5]), RangeError);
});

// ── audpc ─────────────────────────────────────────────────────────────────
test('audpc: trapezoid rule over days', () => {
  const a = G.audpc([
    { date: '2026-01-01', value: 0 },
    { date: '2026-01-11', value: 10 },  // 10 days, mean 5  → 50
    { date: '2026-01-31', value: 30 }   // 20 days, mean 20 → 400
  ]);
  assert.equal(a, 450);
});

test('audpc: unsorted input gives the same result', () => {
  const a = G.audpc([
    { date: '2026-01-31', value: 30 },
    { date: '2026-01-01', value: 0 },
    { date: '2026-01-11', value: 10 }
  ]);
  assert.equal(a, 450);
});

test('audpc: fewer than two points is null', () => {
  assert.equal(G.audpc([]), null);
  assert.equal(G.audpc([{ date: '2026-01-01', value: 5 }]), null);
  assert.equal(G.audpc([{ date: '2026-01-01', value: 5 }, { date: '2026-02-01', value: null }]), null);
});

// ── diseaseReduction ─────────────────────────────────────────────────────
test('diseaseReduction: reproduces GanoCare field result (100% → 26.67%)', () => {
  // Rebitanim et al. 2020: control incidence 100%, T4 26.67% → ~73% lower
  assert.equal(G.diseaseReduction(100, 26.67), 73.33);
});

test('diseaseReduction: worse than control is negative', () => {
  assert.equal(G.diseaseReduction(20, 30), -50);
});

test('diseaseReduction: zero control is null; bad input throws', () => {
  assert.equal(G.diseaseReduction(0, 0), null);
  assert.throws(() => G.diseaseReduction(-1, 0), RangeError);
  assert.throws(() => G.diseaseReduction(NaN, 0), RangeError);
});

// ── compareTrial ─────────────────────────────────────────────────────────
test('compareTrial: treated vs control block', () => {
  const control = {
    name: 'Control',
    censuses: [
      { date: '2026-01-01', counts: [10, 0, 0, 0, 0] },
      { date: '2026-07-01', counts: [5, 2, 2, 1, 0] }
    ]
  };
  const treated = {
    name: 'Trichoderma',
    censuses: [
      { date: '2026-07-01', counts: [9, 1, 0, 0, 0] },
      { date: '2026-01-01', counts: [10, 0, 0, 0, 0] }
    ]
  };
  const r = G.compareTrial(control, treated);
  assert.equal(r.control.latest.incidence, 50);
  assert.equal(r.treated.latest.incidence, 10);
  assert.equal(r.treated.latest.date, '2026-07-01', 'censuses sorted by date');
  assert.equal(r.reduction.incidence, 80);
  assert.equal(r.reduction.audpcIncidence, 80); // both start at 0, linear rise
  assert.ok(r.reduction.dsi > 80);
});

test('compareTrial: single census gives null AUDPC reduction', () => {
  const b = { name: 'x', censuses: [{ date: '2026-01-01', counts: [5, 5, 0, 0, 0] }] };
  const r = G.compareTrial(b, b);
  assert.equal(r.reduction.audpcIncidence, null);
  assert.equal(r.reduction.incidence, 0);
});

// ── buildPlan ────────────────────────────────────────────────────────────
test('buildPlan: early-stage mature palm has the 3 core batches in order', () => {
  const p = G.buildPlan({ setting: 'mature', stage: 1, startDate: '2026-12-01' });
  const treat = p.batches.filter(b => b.number !== null);
  assert.deepEqual(treat.slice(0, 4).map(b => b.week), [0, 4, 8, 12]);
  assert.equal(treat[0].date, '2026-12-01');
  assert.equal(treat[1].date, '2026-12-29');
  assert.ok(treat[0].steps.includes('sanitise.brackets'));
  assert.ok(treat[0].steps.includes('tricho.ring'));
  assert.deepEqual(treat[1].steps.filter(s => s !== 'census'), ['bact.drench']);
  assert.deepEqual(treat.map(b => b.number), treat.map((_, i) => i + 1), 'numbered 1..n');
});

test('buildPlan: severe and dead palms are sanitised, never given maintenance', () => {
  for (const stage of [3, 4]) {
    const p = G.buildPlan({ setting: 'mature', stage, startDate: '2026-12-01' });
    assert.ok(p.batches[0].steps.includes('sanitise.fell'));
    assert.ok(!p.batches.some(b => b.kind === 'maintenance'));
    assert.ok(!p.batches.some(b => b.steps.includes('tricho.ring')), 'no treatment of the palm itself');
    assert.ok(p.warnings.includes('warn.severe'));
    assert.ok(p.warnings.includes('warn.neighbours'));
  }
});

test('buildPlan: moderate stage warns about low chance and chemical conflict', () => {
  const p = G.buildPlan({ setting: 'mature', stage: 2, startDate: '2026-12-01' });
  assert.ok(p.warnings.includes('warn.moderate'));
  assert.ok(p.warnings.includes('warn.chemical'));
});

test('buildPlan: census-only weeks are not numbered as treatment batches', () => {
  const p = G.buildPlan({ setting: 'mature', stage: 0, startDate: '2026-12-01' });
  const census = p.batches.filter(b => b.kind === 'census');
  assert.ok(census.length > 0);
  census.forEach(b => { assert.equal(b.number, null); assert.deepEqual(b.steps, ['census']); });
});

test('buildPlan: nothing scheduled beyond the horizon', () => {
  const p = G.buildPlan({ setting: 'mature', stage: 1, startDate: '2026-12-01', horizonWeeks: 30 });
  assert.ok(p.batches.every(b => b.week <= 30));
  assert.equal(p.batches[p.batches.length - 1].week <= 30, true);
});

test('buildPlan: replant defaults to a 2-year plan with planting-hole treatment', () => {
  const p = G.buildPlan({ setting: 'replant', startDate: '2027-01-04' });
  assert.equal(p.horizonWeeks, 104);
  assert.deepEqual(p.batches[0].steps, ['tricho.hole', 'amf.hole', 'efb.mulch']);
  assert.ok(p.batches.some(b => b.week > 52 && b.kind === 'maintenance'));
});

test('buildPlan: nursery repeats Trichoderma every 12 weeks (as GanoCare every 3 months)', () => {
  const p = G.buildPlan({ setting: 'nursery', startDate: '2027-01-04' });
  const weeks = p.batches.filter(b => b.steps.includes('tricho.nursery')).map(b => b.week);
  assert.deepEqual(weeks, [0, 12, 24, 36, 48]);
});

test('buildPlan: crossing a month/year boundary keeps calendar dates right', () => {
  const p = G.buildPlan({ setting: 'mature', stage: 1, startDate: '2026-12-31', horizonWeeks: 8 });
  assert.equal(p.batches.find(b => b.week === 4).date, '2027-01-28');
  assert.equal(p.batches.find(b => b.week === 8).date, '2027-02-25');
});

test('buildPlan: rejects bad options', () => {
  assert.throws(() => G.buildPlan({ setting: 'garden', startDate: '2026-12-01' }), RangeError);
  assert.throws(() => G.buildPlan({ setting: 'mature', stage: 7, startDate: '2026-12-01' }), RangeError);
  assert.throws(() => G.buildPlan({ setting: 'mature', startDate: '2026-12-01' }), RangeError);
  assert.throws(() => G.buildPlan({ setting: 'nursery', startDate: '2026-02-30' }), RangeError);
  assert.throws(() => G.buildPlan({ setting: 'nursery', startDate: '01/12/2026' }), RangeError);
  assert.throws(() => G.buildPlan({ setting: 'nursery', startDate: '2026-12-01', horizonWeeks: 0 }), RangeError);
});

// ── findChemicalConflicts ────────────────────────────────────────────────
test('findChemicalConflicts: flags Trichoderma batches within 28 days of injection', () => {
  const p = G.buildPlan({ setting: 'mature', stage: 2, startDate: '2026-12-01', horizonWeeks: 12 });
  // Week 4 (2026-12-29) is a bacterial drench only; week 8 (2027-01-26) is Trichoderma.
  const c = G.findChemicalConflicts(p, ['2027-01-12']);
  const dates = c.map(x => x.batchDate);
  assert.ok(dates.includes('2027-01-26'));     // 14 days apart
  assert.ok(!dates.includes('2026-12-29'));    // no Trichoderma that week
  assert.ok(!dates.includes('2026-12-01'));    // 42 days apart
});

test('findChemicalConflicts: no chemicals, no conflicts; custom gap respected', () => {
  const p = G.buildPlan({ setting: 'mature', stage: 1, startDate: '2026-12-01', horizonWeeks: 12 });
  assert.deepEqual(G.findChemicalConflicts(p, []), []);
  assert.equal(G.findChemicalConflicts(p, ['2026-12-15'], 7).length, 0);
  assert.equal(G.findChemicalConflicts(p, ['2026-12-15'], 15).length, 1);
});

// ── planBrews ────────────────────────────────────────────────────────────
test('planBrews: quantities, 30% failure buffer and lead time', () => {
  const p = G.buildPlan({ setting: 'mature', stage: 0, startDate: '2027-03-01', horizonWeeks: 12 });
  const brews = G.planBrews(p, 40);
  assert.equal(brews.length, 2); // weeks 0 and 12 have tricho.ring
  const b = brews[0];
  assert.equal(b.applyDate, '2027-03-01');
  assert.equal(b.brewStart, '2027-02-15');       // 14 days earlier
  assert.equal(b.kgNeeded, 20);                  // 40 palms × 0.5 kg
  assert.equal(b.brews, 15);                     // ceil(20 / 2 / 0.7) = ceil(14.29)
  assert.equal(b.riceKg, 30);
  assert.equal(b.starterG, 60);                  // 1 g per 500 g rice
});

test('planBrews: exact multiple does not round up an extra brew', () => {
  const p = G.buildPlan({ setting: 'mature', stage: 0, startDate: '2027-03-01', horizonWeeks: 1 });
  const b = G.planBrews(p, 4, { batchKg: 1, failureRate: 0 })[0];
  assert.equal(b.kgNeeded, 2);
  assert.equal(b.brews, 2);
});

test('planBrews: rejects bad input', () => {
  const p = G.buildPlan({ setting: 'nursery', startDate: '2027-03-01' });
  assert.throws(() => G.planBrews(p, 0), RangeError);
  assert.throws(() => G.planBrews(p, 10, { failureRate: 1 }), RangeError);
  assert.throws(() => G.planBrews(p, 10, { leadDays: 70 }), RangeError);
});

// ── blocksToCsv ──────────────────────────────────────────────────────────
test('blocksToCsv: header, rows and quoting', () => {
  const csv = G.blocksToCsv([{
    name: 'Block "A", north', role: 'treated',
    censuses: [{ date: '2026-01-01', counts: [8, 2, 0, 0, 0] }]
  }]);
  const lines = csv.trim().split('\n');
  assert.equal(lines[0], 'block,role,date,healthy,early,moderate,severe,dead,n,incidence_pct,dsi_pct');
  assert.equal(lines[1], '"Block ""A"", north",treated,2026-01-01,8,2,0,0,0,10,20,5');
});

// ── Evidence library integrity ───────────────────────────────────────────
test('evidence: every entry has a level 0–3 and https sources', () => {
  const ids = new Set();
  for (const e of G.EVIDENCE) {
    assert.ok(!ids.has(e.id), 'unique id ' + e.id); ids.add(e.id);
    assert.ok([0, 1, 2, 3].includes(e.level), e.id);
    assert.ok(e.sources.length > 0, e.id);
    e.sources.forEach(s => assert.match(s.url, /^https?:\/\//));
  }
});

test('evidence: Pythium oligandrum is not listed (no Ganoderma study found)', () => {
  assert.ok(!G.EVIDENCE.some(e => /pythium/i.test(e.id + e.agent.en)));
});

test('evidence: every text field and source label is in en, ms and zh', () => {
  const langs = ['en', 'ms', 'zh'];
  const check = (v, where) => langs.forEach(l => assert.equal(typeof v[l], 'string', `${where} missing ${l}`));
  for (const e of G.EVIDENCE) {
    for (const f of ['agent', 'setting', 'result', 'note']) {
      check(e[f], `${e.id}.${f}`);
      // filled in all languages, or empty in all (optional note)
      assert.equal(langs.every(l => e[f][l].trim()), !!e[f].en.trim(), `${e.id}.${f} partly translated`);
    }
    e.sources.forEach((s, i) => { check(s.label, `${e.id}.sources[${i}]`); langs.forEach(l => assert.ok(s.label[l].trim())); });
  }
  G.REVIEWS.forEach((r, i) => { check(r.label, `review ${i}`); assert.match(r.url, /^https:\/\//); });
});

// ── Where to buy ─────────────────────────────────────────────────────────
test('products: every product points at existing evidence and has links', () => {
  const ids = new Set(G.EVIDENCE.map(e => e.id));
  const pids = new Set();
  for (const p of G.PRODUCTS) {
    assert.ok(!pids.has(p.id), 'unique ' + p.id); pids.add(p.id);
    assert.ok(p.for.length > 0, p.id);
    p.for.forEach(id => assert.ok(ids.has(id), `${p.id} → unknown evidence ${id}`));
    assert.ok(p.links.length > 0, p.id);
    p.links.forEach(l => assert.match(l.url, /^https?:\/\//));
    for (const f of ['price', 'note']) for (const l of ['en', 'ms', 'zh']) assert.ok(p[f][l].trim(), `${p.id}.${f}.${l}`);
  }
});

test('products: strain-matched products list first; evidence without products returns []', () => {
  assert.equal(G.productsFor('streptomyces')[0].id, 'embio_actinoplus');
  const amf = G.productsFor('pseudomonas_amf').map(p => p.id);
  assert.deepEqual(amf.sort(), ['im_bioguard', 'mycogold']);
  assert.deepEqual(G.productsFor('bvelezensis'), []);
  assert.deepEqual(G.productsFor('bamyloliquefaciens'), []);
  assert.equal(G.productsFor('ganocare')[0].id, 'ganocare_enquiry');
});

test('evidence: GanoEF is listed with a buyable product', () => {
  const e = G.EVIDENCE.find(x => x.id === 'ganoef');
  assert.ok(e);
  assert.equal(G.productsFor('ganoef')[0].id, 'ganoef_product');
});
