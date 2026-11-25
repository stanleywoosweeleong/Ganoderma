/**
 * Ganoderma BSR Manager — core logic (no DOM).
 *
 * Everything in here is a pure function so it can be unit-tested with
 * `node --test` and reused by the browser UI (js/app.js).
 *
 * Works as a CommonJS module (Node tests) and as a browser global
 * (`window.GanoCore`).
 *
 * IMPORTANT — scope of the advice encoded here:
 *  - Biocontrol of Ganoderma boninense is PREVENTIVE / early-stage. No study
 *    found cures an established basal stem rot (BSR) infection in a mature
 *    palm. The plans reflect that: severe and dead palms are sanitised, not
 *    treated.
 *  - Application amounts are indicative farm defaults (Trichoderma rice-grain
 *    rates follow the AMIS farmer recipe: 200–500 g per planting hole). Always
 *    confirm against the product label and MPOB guidance.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GanoCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────
  // Disease classes
  // ───────────────────────────────────────────────────────────────────────
  // 0 Healthy · 1 Early · 2 Moderate · 3 Severe · 4 Dead
  // This 0–4 scale is the app's own field scale, modelled on the
  // disease-severity classes used in BSR literature. DSI is computed with the
  // standard formula  DSI = Σ(class × count) / (maxClass × total) × 100.
  const STAGES = [
    { id: 0, code: 'A', key: 'healthy' },
    { id: 1, code: 'B', key: 'early' },
    { id: 2, code: 'C', key: 'moderate' },
    { id: 3, code: 'D', key: 'severe' },
    { id: 4, code: 'X', key: 'dead' }
  ];
  const MAX_CLASS = 4;

  /**
   * Classify one palm from field observations.
   * @param {object} obs
   * @param {boolean} [obs.dead]           palm dead / trunk snapped
   * @param {boolean} [obs.fruitingBody]   Ganoderma bracket (basidioma) on trunk base or roots
   * @param {number}  [obs.lesionPct]      % of trunk-base circumference with rot (0–100)
   * @param {'none'|'mild'|'severe'} [obs.foliar]
   *        mild   = yellowing / 2+ unopened spear leaves
   *        severe = many unopened spears, fronds collapsing into a skirt
   * @returns {number} class 0–4
   */
  function classifyPalm(obs) {
    const o = obs || {};
    const lesion = o.lesionPct == null ? 0 : Number(o.lesionPct);
    if (!Number.isFinite(lesion) || lesion < 0 || lesion > 100) {
      throw fail('lesion', 'lesionPct must be between 0 and 100');
    }
    const foliar = o.foliar || 'none';
    if (!['none', 'mild', 'severe'].includes(foliar)) {
      throw fail('foliar', 'foliar must be none, mild or severe');
    }
    if (o.dead) return 4;
    if (foliar === 'severe' || lesion >= 50) return 3;
    if (foliar === 'mild' || lesion >= 20) return 2;
    if (o.fruitingBody || lesion > 0) return 1;
    return 0;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Census statistics
  // ───────────────────────────────────────────────────────────────────────
  function validateCounts(counts) {
    if (!Array.isArray(counts) || counts.length !== MAX_CLASS + 1) {
      throw fail('counts', 'counts must be an array of 5 numbers (classes 0–4)');
    }
    counts.forEach(function (c) {
      if (!Number.isInteger(c) || c < 0) throw fail('counts', 'counts must be non-negative integers');
    });
  }

  /**
   * Summarise one census of a block.
   * @param {number[]} counts  palms per class [healthy, early, moderate, severe, dead]
   * @returns {{n:number, infected:number, incidence:number|null, dsi:number|null}}
   *          incidence and DSI in % (null when the block is empty)
   */
  function summariseCensus(counts) {
    validateCounts(counts);
    const n = counts.reduce(function (a, b) { return a + b; }, 0);
    const infected = n - counts[0];
    if (n === 0) return { n: 0, infected: 0, incidence: null, dsi: null };
    const weighted = counts.reduce(function (sum, c, cls) { return sum + c * cls; }, 0);
    return {
      n: n,
      infected: infected,
      incidence: round(infected / n * 100, 2),
      dsi: round(weighted / (MAX_CLASS * n) * 100, 2)
    };
  }

  /**
   * Area under the disease progress curve (trapezoid rule), in %·days.
   * @param {{date:string, value:number}[]} points  dates as YYYY-MM-DD
   * @returns {number|null} null when fewer than 2 points
   */
  function audpc(points) {
    if (!Array.isArray(points)) throw new TypeError('points must be an array');
    const pts = points
      .filter(function (p) { return p && p.value != null && Number.isFinite(Number(p.value)); })
      .map(function (p) { return { t: parseDate(p.date), v: Number(p.value) }; })
      .sort(function (a, b) { return a.t - b.t; });
    if (pts.length < 2) return null;
    let area = 0;
    for (let i = 1; i < pts.length; i++) {
      const days = (pts[i].t - pts[i - 1].t) / DAY_MS;
      area += (pts[i].v + pts[i - 1].v) / 2 * days;
    }
    return round(area, 2);
  }

  /**
   * Percentage disease reduction of a treated plot relative to its control.
   * Works for incidence, DSI or AUDPC values alike.
   * @returns {number|null} null if the control has no disease (no basis to compare)
   */
  function diseaseReduction(control, treated) {
    if (!Number.isFinite(control) || !Number.isFinite(treated) || control < 0 || treated < 0) {
      throw fail('reduction', 'control and treated must be non-negative numbers');
    }
    if (control === 0) return null;
    return round((control - treated) / control * 100, 2);
  }

  /**
   * Full summary of a block (a plot / field / trial arm).
   * @param {{name:string, censuses:{date:string, counts:number[]}[]}} block
   */
  function summariseBlock(block) {
    const censuses = (block.censuses || []).slice().sort(function (a, b) {
      return parseDate(a.date) - parseDate(b.date);
    });
    const rows = censuses.map(function (c) {
      return Object.assign({ date: c.date }, summariseCensus(c.counts));
    });
    const latest = rows.length ? rows[rows.length - 1] : null;
    return {
      name: block.name,
      rows: rows,
      latest: latest,
      audpcIncidence: audpc(rows.map(function (r) { return { date: r.date, value: r.incidence }; })),
      audpcDsi: audpc(rows.map(function (r) { return { date: r.date, value: r.dsi }; }))
    };
  }

  /**
   * AUDPC restricted to [from, to] (dates YYYY-MM-DD). Values at the two
   * boundaries are linearly interpolated from the neighbouring censuses, so
   * blocks observed over different periods can be compared like for like.
   * @returns {number|null} null if the points do not cover the whole interval
   */
  function audpcBetween(points, from, to) {
    const a = parseDate(from), b = parseDate(to);
    if (!(b > a)) return null;
    const pts = points
      .filter(function (p) { return p && p.value != null && Number.isFinite(Number(p.value)); })
      .map(function (p) { return { t: parseDate(p.date), v: Number(p.value) }; })
      .sort(function (x, y) { return x.t - y.t; });
    if (!pts.length || pts[0].t > a || pts[pts.length - 1].t < b) return null;
    function at(t) {
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].t === t) return pts[i].v;
        if (pts[i].t > t) {
          const p0 = pts[i - 1], p1 = pts[i];
          return p0.v + (p1.v - p0.v) * (t - p0.t) / (p1.t - p0.t);
        }
      }
      return null;
    }
    const inside = pts.filter(function (p) { return p.t > a && p.t < b; });
    const seq = [{ t: a, v: at(a) }].concat(inside, [{ t: b, v: at(b) }]);
    let area = 0;
    for (let i = 1; i < seq.length; i++) area += (seq[i].v + seq[i - 1].v) / 2 * (seq[i].t - seq[i - 1].t) / DAY_MS;
    return round(area, 2);
  }

  /**
   * Compare a treated block against an untreated control block, on the
   * SAME dates only (review fix):
   *  - latest incidence / DSI: the latest census date both blocks share
   *    (null if they share no date);
   *  - AUDPC: over the period both blocks were observed — from the later
   *    first census to the earlier last census (null if that period has no
   *    length).
   * `aligned` reports the dates used so the UI can show them.
   */
  function compareTrial(controlBlock, treatedBlock) {
    const c = summariseBlock(controlBlock);
    const t = summariseBlock(treatedBlock);
    function red(a, b) { return a == null || b == null ? null : diseaseReduction(a, b); }

    const tByDate = {};
    t.rows.forEach(function (r) { tByDate[r.date] = r; });
    const shared = c.rows.filter(function (r) { return tByDate[r.date]; });
    const cLatest = shared.length ? shared[shared.length - 1] : null;
    const tLatest = cLatest ? tByDate[cLatest.date] : null;

    let from = null, to = null;
    if (c.rows.length && t.rows.length) {
      const f = [c.rows[0].date, t.rows[0].date].sort()[1];
      const l = [c.rows[c.rows.length - 1].date, t.rows[t.rows.length - 1].date].sort()[0];
      if (parseDate(l) > parseDate(f)) { from = f; to = l; }
    }
    function areaOf(rows, key) {
      return from ? audpcBetween(rows.map(function (r) { return { date: r.date, value: r[key] }; }), from, to) : null;
    }
    const cInc = areaOf(c.rows, 'incidence'), tInc = areaOf(t.rows, 'incidence');
    const cDsi = areaOf(c.rows, 'dsi'), tDsi = areaOf(t.rows, 'dsi');

    return {
      control: c,
      treated: t,
      aligned: { latestDate: cLatest ? cLatest.date : null, from: from, to: to },
      reduction: {
        incidence: red(cLatest && cLatest.incidence, tLatest && tLatest.incidence),
        dsi: red(cLatest && cLatest.dsi, tLatest && tLatest.dsi),
        audpcIncidence: red(cInc, tInc),
        audpcDsi: red(cDsi, tDsi)
      }
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Multi-batch treatment plans
  // ───────────────────────────────────────────────────────────────────────
  // Indicative Trichoderma rice-grain inoculant per palm (kg). Used by the
  // brewing planner. Mix with 5–10× its weight of compost / EFB compost.
  const TRICHO_KG = {
    'tricho.ring': 0.5,      // mature / immature palm, 1 m ring around trunk base
    'tricho.hole': 0.3,      // planting hole (AMIS recipe: 200–500 g)
    'tricho.site': 0.5,      // position of a removed palm
    'tricho.nursery': 0.05   // per polybag seedling
  };

  // Each template: fixed batches + repeating maintenance + census interval.
  // Step keys are translated by the UI (js/i18n.js).
  const TEMPLATES = {
    mature: {
      0: { // healthy palm — prevention, e.g. neighbours of a diseased palm
        fixed: [
          { week: 0, steps: ['tricho.ring', 'efb.mulch'] },
          { week: 6, steps: ['bact.drench'] },
          { week: 12, steps: ['tricho.ring'] }
        ],
        repeat: { from: 28, every: 16, steps: ['tricho.ring'] },
        censusEvery: 26,
        warnings: ['warn.prevention']
      },
      1: { // early
        fixed: [
          { week: 0, steps: ['sanitise.brackets', 'sanitise.surgery', 'mound', 'tricho.ring'] },
          { week: 4, steps: ['bact.drench'] },
          { week: 8, steps: ['tricho.ring'] },
          { week: 12, steps: ['mound'] }
        ],
        repeat: { from: 24, every: 12, steps: ['tricho.ring', 'bact.drench'] },
        censusEvery: 12,
        warnings: ['warn.early', 'warn.neighbours']
      },
      2: { // moderate
        fixed: [
          { week: 0, steps: ['sanitise.brackets', 'sanitise.surgery', 'mound', 'tricho.ring'] },
          { week: 4, steps: ['bact.drench'] },
          { week: 8, steps: ['tricho.ring'] },
          { week: 12, steps: ['mound'] }
        ],
        repeat: { from: 20, every: 8, steps: ['tricho.ring', 'bact.drench'] },
        censusEvery: 6,
        warnings: ['warn.moderate', 'warn.chemical', 'warn.neighbours']
      },
      3: { // severe — not treatable, remove inoculum
        fixed: [
          { week: 0, steps: ['sanitise.fell', 'sanitise.bole', 'sanitise.chip'] },
          { week: 2, steps: ['tricho.site', 'efb.mulch'] }
        ],
        repeat: null,
        censusEvery: 12,
        warnings: ['warn.severe', 'warn.neighbours']
      },
      4: { // dead
        fixed: [
          { week: 0, steps: ['sanitise.fell', 'sanitise.bole', 'sanitise.chip'] },
          { week: 2, steps: ['tricho.site', 'efb.mulch'] }
        ],
        repeat: null,
        censusEvery: 12,
        warnings: ['warn.severe', 'warn.neighbours']
      }
    },
    replant: {
      fixed: [
        { week: 0, steps: ['tricho.hole', 'amf.hole', 'efb.mulch'] },
        { week: 4, steps: ['bact.drench'] },
        { week: 12, steps: ['tricho.ring'] }
      ],
      repeat: { from: 24, every: 12, steps: ['tricho.ring'] },
      censusEvery: 26,
      warnings: ['warn.replant']
    },
    nursery: {
      fixed: [
        { week: 0, steps: ['tricho.nursery', 'amf.nursery'] },
        { week: 4, steps: ['bact.drench.nursery'] }
      ],
      repeat: { from: 12, every: 12, steps: ['tricho.nursery'] },
      censusEvery: 4,
      warnings: ['warn.nursery']
    }
  };

  const SETTINGS = ['mature', 'replant', 'nursery'];
  const DEFAULT_HORIZON = { mature: 52, replant: 104, nursery: 52 };


  // ───────────────────────────────────────────────────────────────────────
  // Basis of each plan step (review fix). The plans are PROVISIONAL planning
  // assumptions: studies tested single preventive treatments on seedlings,
  // not this staged programme. Every step states what it rests on.
  // kind: 'study' | 'label' | 'practice' | 'assumption'
  // ───────────────────────────────────────────────────────────────────────
  const SRC = {
    habu: { label: 'Habu et al. 2018 (PDF)', url: 'https://jopr.mpob.gov.my/wp-content/uploads/2018/09/jopr2018inpress-habu.pdf' },
    asis: { label: 'Asis et al., JOPR 2025 (PDF)', url: 'https://jopr.mpob.gov.my/files/2025/02/joprv38june2026-rashid.pdf' },
    trichoshield: { label: 'MPOB SawitSecure — TrichoShield rates', url: 'http://sawitsecure.mpob.gov.my/disease-control-and-management/commercial-product-for-preventive-treatment/trichoshield/' },
    sundram: { label: 'Sundram et al. 2015 (abstract)', url: 'https://agris.fao.org/search/en/records/65de6bf2b766d82b18fd663f' },
    upm: { label: 'UPM eprint 32011', url: 'https://libmast.utm.my/Record/upm.eprints-32011/Description' }
  };
  const ASSUME = 'assumption', LABEL = 'label', PRACTICE = 'practice';
  const SANITATION = {
    kind: PRACTICE,
    text: { en: 'Common BSR sanitation practice. Not checked against a specific source in this app.',
            ms: 'Amalan sanitasi BSR yang biasa. Tidak disemak dengan sumber khusus dalam aplikasi ini.',
            zh: '常见的茎基腐病卫生措施。本应用未核对具体来源。' },
    sources: []
  };
  const STEP_BASIS = {
    'tricho.ring': { kind: ASSUME,
      text: { en: '0.5 kg of inoculant per palm is an app assumption. MPOB\'s TrichoShield label uses 5 kg of a 1:3 product–compost mix per mature palm every 6 months. Studies used measured spore suspensions on seedlings before infection.',
              ms: '0.5 kg inokulum setiap pokok ialah andaian aplikasi. Label TrichoShield MPOB guna 5 kg campuran produk–kompos 1:3 setiap pokok matang setiap 6 bulan. Kajian guna ampaian spora tersukat pada anak benih sebelum jangkitan.',
              zh: '每棵 0.5 kg 菌种为本应用的假设。MPOB 的 TrichoShield 标签:成龄棕树每 6 个月施 5 kg(产品与堆肥 1:3 混合)。研究使用的是在感染前施于幼苗的定量孢子悬液。' },
      sources: [SRC.trichoshield, SRC.habu] },
    'tricho.hole': { kind: ASSUME,
      text: { en: '200–500 g is the AMIS farmer-recipe rate, not from a trial. MPOB\'s TrichoShield label: 1 kg per hole at field planting.',
              ms: '200–500 g ialah kadar resipi petani AMIS, bukan daripada percubaan. Label TrichoShield MPOB: 1 kg setiap lubang semasa tanam di ladang.',
              zh: '200–500 g 为 AMIS 农户配方用量,并非来自试验。MPOB 的 TrichoShield 标签:田间定植每穴 1 kg。' },
      sources: [SRC.trichoshield] },
    'tricho.site': { kind: ASSUME,
      text: { en: 'App assumption — no study tested treating the position of a removed palm.',
              ms: 'Andaian aplikasi — tiada kajian menguji rawatan tapak pokok yang telah dibuang.',
              zh: '本应用假设 — 没有研究测试过处理已移除棕树的原位。' },
      sources: [] },
    'tricho.nursery': { kind: ASSUME,
      text: { en: '~50 g per polybag is an app assumption. The 2025 study used a single 100 mL spore suspension per seedling.',
              ms: '~50 g setiap polibag ialah andaian aplikasi. Kajian 2025 guna satu ampaian spora 100 mL setiap anak benih.',
              zh: '每袋约 50 g 为本应用假设。2025 年的研究每株幼苗单次施用 100 mL 孢子悬液。' },
      sources: [SRC.asis] },
    'bact.drench': { kind: LABEL,
      text: { en: 'Use the product label rate. No study tested these products on this schedule.',
              ms: 'Guna kadar label produk. Tiada kajian menguji produk ini mengikut jadual ini.',
              zh: '按产品标签用量。没有研究按此时间表测试过这些产品。' },
      sources: [] },
    'amf.hole': { kind: LABEL,
      text: { en: 'Use the product label rate. The study pre-inoculated seedlings with specific Glomus isolates; any AMF product is not shown to match.',
              ms: 'Guna kadar label produk. Kajian menginokulasi anak benih dengan isolat Glomus tertentu; produk AMF lain tidak terbukti sama.',
              zh: '按产品标签用量。研究使用特定球囊霉菌株预先接种幼苗;其他菌根产品未证明等效。' },
      sources: [SRC.sundram] },
    'efb.mulch': { kind: PRACTICE,
      text: { en: 'EFB compost was suggested as a Trichoderma carrier in UPM research. No tested mulching rate.',
              ms: 'Kompos TKS dicadangkan sebagai pembawa Trichoderma dalam kajian UPM. Tiada kadar sungkupan yang diuji.',
              zh: 'UPM 研究建议以空果串堆肥作为木霉载体。没有经过测试的覆盖用量。' },
      sources: [SRC.upm] },
    'sanitise.brackets': SANITATION, 'sanitise.surgery': SANITATION, 'mound': SANITATION,
    'sanitise.fell': SANITATION, 'sanitise.bole': SANITATION, 'sanitise.chip': SANITATION,
    'census': { kind: ASSUME,
      text: { en: 'App method for tracking disease (0–4 scale, incidence, DSI, AUDPC).',
              ms: 'Kaedah aplikasi untuk menjejak penyakit (skala 0–4, insiden, DSI, AUDPC).',
              zh: '本应用的病害追踪方法(0–4 级、发病率、病情指数、AUDPC)。' },
      sources: [] }
  };
  STEP_BASIS['bact.drench.nursery'] = STEP_BASIS['bact.drench'];
  STEP_BASIS['amf.nursery'] = STEP_BASIS['amf.hole'];

  /** What a plan step rests on: { kind, text:{en,ms,zh}, sources[] }. */
  function stepBasis(step) { return STEP_BASIS[step] || null; }

  /**
   * Build a multi-batch treatment plan.
   * @param {object} opts
   * @param {'mature'|'replant'|'nursery'} opts.setting
   * @param {number} [opts.stage]       0–4, required for 'mature'
   * @param {string} opts.startDate     YYYY-MM-DD (week 0)
   * @param {number} [opts.horizonWeeks]
   * @returns {{setting, stage, warnings:string[], batches:object[]}}
   */
  function buildPlan(opts) {
    const o = opts || {};
    if (!SETTINGS.includes(o.setting)) throw fail('setting', 'setting must be mature, replant or nursery');
    let tpl = TEMPLATES[o.setting];
    let stage = null;
    if (o.setting === 'mature') {
      stage = Number(o.stage);
      if (!Number.isInteger(stage) || stage < 0 || stage > MAX_CLASS) {
        throw fail('stage', 'stage must be an integer 0–4 for mature palms');
      }
      tpl = tpl[stage];
    }
    const start = parseDate(o.startDate);
    const horizon = o.horizonWeeks == null ? DEFAULT_HORIZON[o.setting] : Number(o.horizonWeeks);
    if (!Number.isInteger(horizon) || horizon < 1 || horizon > 520) {
      throw fail('horizon', 'horizonWeeks must be an integer 1–520');
    }

    // week -> { steps:Set, kinds:Set }
    const byWeek = new Map();
    function add(week, steps, kind) {
      if (week > horizon) return;
      if (!byWeek.has(week)) byWeek.set(week, { steps: [], kinds: [] });
      const slot = byWeek.get(week);
      steps.forEach(function (s) { if (!slot.steps.includes(s)) slot.steps.push(s); });
      if (!slot.kinds.includes(kind)) slot.kinds.push(kind);
    }
    tpl.fixed.forEach(function (b) { add(b.week, b.steps, 'batch'); });
    if (tpl.repeat) {
      for (let w = tpl.repeat.from; w <= horizon; w += tpl.repeat.every) add(w, tpl.repeat.steps, 'maintenance');
    }
    for (let w = tpl.censusEvery; w <= horizon; w += tpl.censusEvery) add(w, ['census'], 'census');

    const weeks = Array.from(byWeek.keys()).sort(function (a, b) { return a - b; });
    let treatNo = 0;
    const batches = weeks.map(function (week) {
      const slot = byWeek.get(week);
      // A slot that only contains a census is not a treatment batch.
      const isTreatment = slot.steps.some(function (s) { return s !== 'census'; });
      const kind = isTreatment ? (slot.kinds.includes('batch') ? 'batch' : 'maintenance') : 'census';
      return {
        number: isTreatment ? ++treatNo : null,
        week: week,
        date: formatDate(new Date(start + week * 7 * DAY_MS)),
        kind: kind,
        steps: slot.steps.slice()
      };
    });

    return {
      setting: o.setting,
      stage: stage,
      horizonWeeks: horizon,
      warnings: tpl.warnings.slice(),
      batches: batches
    };
  }


  /**
   * Which kinds of treatment a batch involves, for labelling the timeline:
   * 'sanitation' (clean-up / mounding / felling, no microbe), 'tricho'
   * (Trichoderma), 'bacteria' (Pseudomonas + Bacillus or Streptomyces
   * products), 'amf' (mycorrhiza). Order is fixed so labels read the same.
   */
  const AGENT_ORDER = ['sanitation', 'tricho', 'bacteria', 'amf'];
  function batchAgents(steps) {
    const found = {};
    (steps || []).forEach(function (s) {
      if (s.indexOf('tricho.') === 0) found.tricho = true;
      else if (s.indexOf('bact.') === 0) found.bacteria = true;
      else if (s.indexOf('amf.') === 0) found.amf = true;
      else if (s.indexOf('sanitise.') === 0 || s === 'mound') found.sanitation = true;
    });
    return AGENT_ORDER.filter(function (a) { return found[a]; });
  }

  /**
   * Find Trichoderma batches that fall too close to a chemical
   * (e.g. hexaconazole trunk injection) — azole fungicides kill Trichoderma.
   * @param {object} plan          from buildPlan
   * @param {string[]} chemDates   YYYY-MM-DD dates of chemical treatment
   * @param {number} [gapDays=28]  app default; adjust per product advice
   * @returns {{batchDate:string, chemDate:string, daysApart:number}[]}
   */
  function findChemicalConflicts(plan, chemDates, gapDays) {
    const gap = gapDays == null ? 28 : gapDays;
    const out = [];
    (chemDates || []).forEach(function (cd) {
      const ct = parseDate(cd);
      plan.batches.forEach(function (b) {
        if (!b.steps.some(isTricho)) return;
        const days = Math.abs(parseDate(b.date) - ct) / DAY_MS;
        if (days < gap) out.push({ batchDate: b.date, chemDate: cd, daysApart: days });
      });
    });
    return out;
  }

  function isTricho(step) { return Object.prototype.hasOwnProperty.call(TRICHO_KG, step); }

  // ───────────────────────────────────────────────────────────────────────
  // Brewing planner (multi-batch DIY Trichoderma production)
  // ───────────────────────────────────────────────────────────────────────
  /**
   * For every plan batch that needs Trichoderma, work out how much inoculant
   * to brew and when to start, based on the AMIS rice-grain recipe:
   * 1 g starter per 500 g cooked rice, 5–7 days incubation + drying, use
   * within ~2 months, ~30% DIY failure rate.
   *
   * @param {object} plan
   * @param {number} palms                 palms (or polybags) treated
   * @param {object} [opts]
   * @param {number} [opts.batchKg=2]      kg of cooked rice per brew tray/batch
   * @param {number} [opts.failureRate=0.3]
   * @param {number} [opts.leadDays=14]    brew start → application
   * @param {number} [opts.shelfDays=60]
   */
  function planBrews(plan, palms, opts) {
    const o = Object.assign({ batchKg: 2, failureRate: 0.3, leadDays: 14, shelfDays: 60 }, opts || {});
    if (!Number.isInteger(palms) || palms < 1) throw fail('palms', 'palms must be a positive integer');
    if (!(o.batchKg > 0)) throw fail('batchKg', 'batchKg must be > 0');
    if (!(o.failureRate >= 0 && o.failureRate < 1)) throw fail('failureRate', 'failureRate must be in [0, 1)');
    if (o.leadDays >= o.shelfDays) throw fail('leadDays', 'leadDays must be shorter than shelfDays');

    return plan.batches
      .filter(function (b) { return b.steps.some(isTricho); })
      .map(function (b) {
        const kgPerPalm = b.steps.filter(isTricho).reduce(function (s, k) { return s + TRICHO_KG[k]; }, 0);
        const kgNeeded = round(kgPerPalm * palms, 3);
        const brews = Math.ceil(kgNeeded / o.batchKg / (1 - o.failureRate) - 1e-9);
        const riceKg = round(brews * o.batchKg, 3);
        return {
          applyDate: b.date,
          brewStart: formatDate(new Date(parseDate(b.date) - o.leadDays * DAY_MS)),
          useBy: formatDate(new Date(parseDate(b.date) - o.leadDays * DAY_MS + o.shelfDays * DAY_MS)),
          kgNeeded: kgNeeded,
          brews: brews,
          riceKg: riceKg,
          starterG: round(riceKg * 2, 1) // 1 g per 500 g rice
        };
      });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Evidence library (from the literature search, Nov 2026)
  // level: 3 = field / bait-seedling field trial · 2 = nursery / glasshouse
  //        1 = lab plate or related host only
  // weak: true → shown with a "Weak evidence" badge (single unreplicated
  //        study, abstract-only data, related host only, or developer-only
  //        figures).
  // ───────────────────────────────────────────────────────────────────────
  // Text fields are { en, ms, zh }. Scientific names stay in Latin; paper
  // titles / journal names stay as published.
  const EVIDENCE = [
    {
      id: 'pseudomonas_amf',
      agent: {
        en: 'Pseudomonas aeruginosa UPMP3 + Glomus intraradices UT126 + G. clarum BR152B (AMF)',
        ms: 'Pseudomonas aeruginosa UPMP3 + Glomus intraradices UT126 + G. clarum BR152B (AMF)',
        zh: '铜绿假单胞菌 (Pseudomonas aeruginosa) UPMP3 + 根内球囊霉 UT126 + 明球囊霉 BR152B (AMF 菌根真菌)'
      },
      level: 3,
      setting: {
        en: 'Seedlings pre-inoculated before exposure: nursery + 20-month bait-seedling field trial (Sundram et al. 2015)',
        ms: 'Anak benih diinokulasi lebih awal sebelum pendedahan: tapak semaian + percubaan ladang anak benih umpan 20 bulan (Sundram et al. 2015)',
        zh: '幼苗在接触病菌前预先接种:苗圃 + 20 个月田间诱饵苗试验(Sundram 等 2015)'
      },
      result: {
        en: 'Abstract: the combination "significantly improved biocontrol efficacy in both nursery and fields reducing BSR disease to 57 and 80%". Whether these are % reduction or % disease remaining needs the full tables. G. intraradices UT126 alone also reduced BSR development.',
        ms: 'Abstrak: gabungan ini "meningkatkan keberkesanan kawalan biologi dengan ketara di tapak semaian dan ladang, mengurangkan penyakit BSR kepada 57 dan 80%". Sama ada ini % pengurangan atau % penyakit yang tinggal perlu disemak dalam jadual penuh. G. intraradices UT126 sahaja juga mengurangkan perkembangan BSR.',
        zh: '摘要:该组合"在苗圃和田间均显著提高生防效果,使茎基腐病减少至 57% 和 80%"。这是减少的百分比还是剩余病害的百分比,需查阅全文表格确认。单用根内球囊霉 UT126 也能减缓病害发展。'
      },
      note: {
        en: 'Applies to these specific strains, applied to seedlings before infection. No study shows that a commercial Pseudomonas/Bacillus product plus any AMF product reproduces this effect. P. aeruginosa is an opportunistic human pathogen — registered products only, gloves and eye protection.',
        ms: 'Terpakai kepada strain khusus ini, diberi kepada anak benih sebelum jangkitan. Tiada kajian menunjukkan produk komersial Pseudomonas/Bacillus bersama mana-mana produk AMF menghasilkan kesan yang sama. P. aeruginosa ialah patogen oportunis manusia — produk berdaftar sahaja, sarung tangan dan pelindung mata.',
        zh: '仅适用于这些特定菌株,且在感染前施用于幼苗。没有研究表明商业假单胞菌/芽孢杆菌产品加任意菌根产品能重现此效果。铜绿假单胞菌是人类机会性病原菌 — 只用已登记产品,戴手套和护目镜。'
      },
      sources: [
        { label: { en: 'Sundram et al. 2015, Mycorrhiza 25:387–397 (publisher)', ms: 'Sundram et al. 2015, Mycorrhiza 25:387–397 (penerbit)', zh: 'Sundram 等 2015, Mycorrhiza 25:387–397(出版社)' }, url: 'https://link.springer.com/article/10.1007/s00572-014-0620-5' },
        { label: { en: 'Abstract (AGRIS)', ms: 'Abstrak (AGRIS)', zh: '摘要 (AGRIS)' }, url: 'https://agris.fao.org/search/en/records/65de6bf2b766d82b18fd663f' }
      ]
    },
    {
      id: 'trichoderma_mix',
      agent: {
        en: 'Trichoderma harzianum + T. asperellum + T. virens (mixture)',
        ms: 'Trichoderma harzianum + T. asperellum + T. virens (campuran)',
        zh: '哈茨木霉 + 棘孢木霉 + 绿木霉(混合剂)'
      },
      level: 2,
      setting: {
        en: '4-month-old seedlings in sterilised soil; measured spore suspensions applied 2 weeks BEFORE artificial Ganoderma inoculation; 10 replicates per treatment (Habu et al. 2018)',
        ms: 'Anak benih 4 bulan dalam tanah steril; ampaian spora tersukat diberi 2 minggu SEBELUM inokulasi Ganoderma buatan; 10 replikasi setiap rawatan (Habu et al. 2018)',
        zh: '4 月龄幼苗,灭菌土壤;在人工接种灵芝前 2 周施用定量孢子悬液;每处理 10 个重复(Habu 等 2018)'
      },
      result: {
        en: 'About 83% reduction in foliar symptoms and 89% in bole symptoms',
        ms: 'Kira-kira 83% pengurangan simptom daun dan 89% simptom pangkal batang',
        zh: '叶部症状减少约 83%,茎基症状减少约 89%'
      },
      note: {
        en: 'Shows preventive activity in a nursery. It does not test rice-grain inoculant doses, repeated applications, or treatment of mature palms that already have symptoms.',
        ms: 'Menunjukkan aktiviti pencegahan di tapak semaian. Ia tidak menguji dos inokulum beras, aplikasi berulang, atau rawatan pokok matang yang sudah bersimptom.',
        zh: '显示了苗圃条件下的预防作用。未测试米粒菌种用量、重复施用,或已出现症状的成龄棕树的治疗。'
      },
      sources: [
        { label: { en: 'Habu et al. 2018, JOPR 30(3):403–415', ms: 'Habu et al. 2018, JOPR 30(3):403–415', zh: 'Habu 等 2018, JOPR 30(3):403–415' }, url: 'https://jopr.mpob.gov.my/?p=8761' },
        { label: { en: 'Full text (PDF)', ms: 'Teks penuh (PDF)', zh: '全文 (PDF)' }, url: 'https://jopr.mpob.gov.my/wp-content/uploads/2018/09/jopr2018inpress-habu.pdf' }
      ]
    },
    {
      id: 'trichoderma_local',
      agent: {
        en: 'Local T. virens / T. asperellum isolates (singly or combined)',
        ms: 'Isolat tempatan T. virens / T. asperellum (tunggal atau gabungan)',
        zh: '本地绿木霉 / 棘孢木霉菌株(单用或混用)'
      },
      level: 2,
      setting: {
        en: 'Seedlings, artificial inoculation; a single 100 mL application of a specified conidial suspension; followed for 9 months (Asis et al., JOPR, online 2025)',
        ms: 'Anak benih, inokulasi buatan; satu aplikasi 100 mL ampaian konidia tertentu; dipantau 9 bulan (Asis et al., JOPR, dalam talian 2025)',
        zh: '幼苗,人工接种;单次施用 100 mL 指定浓度的分生孢子悬液;观察 9 个月(Asis 等,JOPR,2025 年网络发表)'
      },
      result: {
        en: 'Disease reduction 41.82–57.73% (calculated from AUDPC), on par with two commercial biocontrol products',
        ms: 'Pengurangan penyakit 41.82–57.73% (dikira daripada AUDPC), setanding dengan dua produk kawalan biologi komersial',
        zh: '病害减少 41.82–57.73%(按 AUDPC 计算),与两种商业生防产品相当'
      },
      note: {
        en: 'Combining the two isolates did NOT improve the result. Does not show that repeated applications or combining more microbes work better. Isolates T4RH (T. virens) and T8R (T. asperellum) were selected from 20 in a 2024 screening study.',
        ms: 'Menggabungkan dua isolat TIDAK memperbaiki keputusan. Tidak menunjukkan aplikasi berulang atau gabungan lebih banyak mikrob lebih berkesan. Isolat T4RH (T. virens) dan T8R (T. asperellum) dipilih daripada 20 dalam kajian saringan 2024.',
        zh: '两个菌株混用并未提高效果。未证明重复施用或组合更多微生物效果更好。T4RH(绿木霉)与 T8R(棘孢木霉)系 2024 年筛选研究从 20 个菌株中选出。'
      },
      sources: [
        { label: { en: 'Asis et al., JOPR 38 (online 2025) — full text', ms: 'Asis et al., JOPR 38 (dalam talian 2025) — teks penuh', zh: 'Asis 等,JOPR 38(2025 网络发表)— 全文' }, url: 'https://jopr.mpob.gov.my/files/2025/02/joprv38june2026-rashid.pdf' },
        { label: { en: 'JOPR article page', ms: 'Halaman artikel JOPR', zh: 'JOPR 文章页' }, url: 'https://jopr.mpob.gov.my/?p=14135' },
        { label: { en: 'Isolate screening, Sarhad J Agric 2024 (UMS)', ms: 'Saringan isolat, Sarhad J Agric 2024 (UMS)', zh: '菌株筛选,Sarhad J Agric 2024 (UMS)' }, url: 'https://eprints.ums.edu.my/id/eprint/42344' }
      ]
    },
    {
      id: 'trichoderma_harzianum',
      agent: {
        en: 'Trichoderma harzianum (FA 1132, T32) ± AMF, in compost',
        ms: 'Trichoderma harzianum (FA 1132, T32) ± AMF, dalam kompos',
        zh: '哈茨木霉 (FA 1132, T32) ± 菌根真菌,施于堆肥中'
      },
      level: 2,
      setting: {
        en: 'Glasshouse; field trial measured growth only',
        ms: 'Rumah kaca; percubaan ladang hanya mengukur pertumbuhan',
        zh: '温室;田间试验只测量了生长'
      },
      result: {
        en: 'T32: 60% seedling survival vs 0% control; T. harzianum compost: 100% BSR reduction (glasshouse)',
        ms: 'T32: 60% anak benih hidup berbanding 0% kawalan; kompos T. harzianum: BSR berkurang 100% (rumah kaca)',
        zh: 'T32:幼苗存活 60%,对照为 0%;哈茨木霉堆肥:茎基腐病减少 100%(温室)'
      },
      note: {
        en: 'EFB compost and bran recommended as field carriers.',
        ms: 'Kompos TKS (tandan kosong sawit) dan dedak disyorkan sebagai pembawa di ladang.',
        zh: '推荐以空果串 (EFB) 堆肥和米糠作为田间载体。'
      },
      sources: [
        { label: { en: 'UPM eprint 9095', ms: 'UPM eprint 9095', zh: 'UPM 论文库 9095' }, url: 'https://libmast.utm.my/Record/upm.eprints-9095/Description' },
        { label: { en: 'UPM eprint 32011', ms: 'UPM eprint 32011', zh: 'UPM 论文库 32011' }, url: 'https://libmast.utm.my/Record/upm.eprints-32011/Description' },
        { label: { en: 'Trichoderma + mycorrhizae (ResearchGate)', ms: 'Trichoderma + mikoriza (ResearchGate)', zh: '木霉 + 菌根真菌 (ResearchGate)' }, url: 'https://www.researchgate.net/publication/358340736_Potential_of_Trichoderma_and_mycorrhizae_as_biological_agents_for_controlling_Ganoderma_boninense_in_oil_palm' }
      ]
    },
    {
      id: 'streptomyces',
      agent: {
        en: 'Streptomyces spp. (AGA347, S. palmae CMU-AB204T, GanoSA1)',
        ms: 'Streptomyces spp. (AGA347, S. palmae CMU-AB204T, GanoSA1)',
        zh: '链霉菌属 Streptomyces(AGA347、S. palmae CMU-AB204T、GanoSA1)'
      },
      level: 2,
      setting: { en: 'Glasshouse seedlings', ms: 'Anak benih rumah kaca', zh: '温室幼苗' },
      result: {
        en: 'AGA347 formulation reduced BSR 73.1%; GanoSA1 induces defence enzymes (PAL, POX, PPO, β-glucanase)',
        ms: 'Formulasi AGA347 mengurangkan BSR 73.1%; GanoSA1 merangsang enzim pertahanan (PAL, POX, PPO, β-glukanase)',
        zh: 'AGA347 制剂使茎基腐病减少 73.1%;GanoSA1 诱导防御酶(PAL、POX、PPO、β-葡聚糖酶)'
      },
      note: {
        en: 'Shelf life of formulations still a problem. Not S. griseus specifically.',
        ms: 'Jangka hayat simpanan formulasi masih menjadi masalah. Bukan S. griseus secara khusus.',
        zh: '制剂货架期仍是问题。并非专指灰色链霉菌 (S. griseus)。'
      },
      sources: [
        { label: { en: 'World J Microbiol Biotechnol 2017', ms: 'World J Microbiol Biotechnol 2017', zh: 'World J Microbiol Biotechnol 2017' }, url: 'https://springerlink.bibliotecabuap.elogim.com/doi/10.1007/s11274-017-2396-1' },
        { label: { en: 'JOPR 2023 (GanoSA1)', ms: 'JOPR 2023 (GanoSA1)', zh: 'JOPR 2023 (GanoSA1)' }, url: 'https://jopr.mpob.gov.my/?p=12357' },
        { label: { en: 'Japanis et al. 2021 (combinations)', ms: 'Japanis et al. 2021 (gabungan)', zh: 'Japanis 等 2021(组合制剂)' }, url: 'https://libmast.utm.my/Record/ums.eprints-26711/Description' }
      ]
    },
    {
      id: 'bsubtilis_amf',
      agent: { en: 'Bacillus subtilis B10 + AMF', ms: 'Bacillus subtilis B10 + AMF', zh: '枯草芽孢杆菌 (Bacillus subtilis) B10 + 菌根真菌' },
      level: 2,
      setting: { en: 'Greenhouse seedlings (Indonesia)', ms: 'Anak benih rumah hijau (Indonesia)', zh: '温室幼苗(印度尼西亚)' },
      result: {
        en: 'Lower BSR incidence, better height and P uptake',
        ms: 'Insiden BSR lebih rendah, ketinggian dan pengambilan P lebih baik',
        zh: '茎基腐发病率降低,株高和磷吸收改善'
      },
      note: { en: '', ms: '', zh: '' },
      sources: [
        { label: { en: 'IPB repository', ms: 'Repositori IPB', zh: 'IPB 论文库' }, url: 'https://repository.ipb.ac.id/handle/123456789/52916' },
        { label: { en: 'Microbiology Indonesia 2013', ms: 'Microbiology Indonesia 2013', zh: 'Microbiology Indonesia 2013' }, url: 'https://doaj.org/article/22447d82b6214e18b10240625461e83e' }
      ]
    },
    {
      id: 'amf',
      agent: {
        en: 'Arbuscular mycorrhizal fungi (AMF) alone',
        ms: 'Kulat mikoriza arbuskular (AMF) sahaja',
        zh: '丛枝菌根真菌 (AMF) 单独使用'
      },
      level: 2,
      weak: true,
      weakWhy: { en: 'Popular summary only — no species, doses or statistics', ms: 'Ringkasan umum sahaja — tiada spesies, dos atau statistik', zh: '仅为科普摘要 — 无菌种、用量及统计数据' },
      setting: {
        en: 'Seedlings inoculated with AMF before Ganoderma: pot trial (9 months) and a small field comparison (60 + 60 seedlings, 10 months) — MPOB article; G. intraradices UT126 in Sundram et al. 2015',
        ms: 'Anak benih diinokulasi AMF sebelum Ganoderma: percubaan pasu (9 bulan) dan perbandingan ladang kecil (60 + 60 anak benih, 10 bulan) — artikel MPOB; G. intraradices UT126 dalam Sundram et al. 2015',
        zh: '幼苗先接种菌根再接触灵芝:盆栽试验(9 个月)及小型田间对比(60 + 60 株,10 个月)— MPOB 文章;Sundram 等 2015 中的根内球囊霉 UT126'
      },
      result: {
        en: 'Pot trial: all non-mycorrhizal palms diseased vs 20% of mycorrhizal palms with symptoms (10% died). Field: 5 of 60 uninoculated vs 2 of 60 mycorrhizal palms died. Sundram: G. intraradices UT126 alone reduced BSR development.',
        ms: 'Percubaan pasu: semua pokok tanpa mikoriza berpenyakit berbanding 20% pokok bermikoriza bersimptom (10% mati). Ladang: 5 daripada 60 pokok tanpa inokulasi berbanding 2 daripada 60 pokok bermikoriza mati. Sundram: G. intraradices UT126 sahaja mengurangkan perkembangan BSR.',
        zh: '盆栽:无菌根棕树全部发病,有菌根的仅 20% 出现症状(10% 死亡)。田间:未接种 60 株中死亡 5 株,接种菌根 60 株中死亡 2 株。Sundram:单用根内球囊霉 UT126 能减缓茎基腐发展。'
      },
      note: {
        en: 'The MPOB article is a popular summary: it names no AMF species, gives no doses and no statistics. No source found for a specific dose per polybag.',
        ms: 'Artikel MPOB ialah ringkasan umum: tiada spesies AMF, dos atau statistik dinyatakan. Tiada sumber ditemui untuk dos khusus setiap polibag.',
        zh: 'MPOB 文章为科普摘要:未注明菌根种类、用量及统计分析。未找到每袋具体用量的来源。'
      },
      sources: [
        { label: { en: 'MPOB — Ganoderma versus mycorrhiza', ms: 'MPOB — Ganoderma lawan mikoriza', zh: 'MPOB — 灵芝 vs 菌根真菌' }, url: 'https://opb.mpob.gov.my/ganoderma-versus-mycorrhiza/' },
        { label: { en: 'Sundram et al. 2015 (abstract, AGRIS)', ms: 'Sundram et al. 2015 (abstrak, AGRIS)', zh: 'Sundram 等 2015(摘要,AGRIS)' }, url: 'https://agris.fao.org/search/en/records/65de6bf2b766d82b18fd663f' }
      ]
    },
    {
      id: 'bvelezensis',
      weak: true,
      weakWhy: { en: 'Different host and pathogen (rubber tree, G. pseudoferreum)', ms: 'Perumah dan patogen berbeza (pokok getah, G. pseudoferreum)', zh: '寄主与病原菌不同(橡胶树,G. pseudoferreum)' },
      agent: { en: 'Bacillus velezensis', ms: 'Bacillus velezensis', zh: '贝莱斯芽孢杆菌 (Bacillus velezensis)' },
      level: 1,
      setting: {
        en: 'Rubber tree (related pathogen G. pseudoferreum)',
        ms: 'Pokok getah (patogen berkaitan G. pseudoferreum)',
        zh: '橡胶树(近缘病原菌 G. pseudoferreum)'
      },
      result: {
        en: 'RUBBER TREES, G. pseudoferreum (red root rot) — not oil palm BSR: SF305 ~70% curative, >90% preventive efficacy',
        ms: 'POKOK GETAH, G. pseudoferreum (reput akar merah) — bukan BSR kelapa sawit: SF305 ~70% merawat, >90% mencegah',
        zh: '橡胶树,G. pseudoferreum(红根病)— 非油棕茎基腐病:SF305 治疗效果约 70%,预防效果超过 90%'
      },
      note: {
        en: 'No direct data on G. boninense in oil palm found.',
        ms: 'Tiada data langsung tentang G. boninense pada kelapa sawit.',
        zh: '未找到针对油棕博宁灵芝 (G. boninense) 的直接数据。'
      },
      sources: [
        { label: { en: 'J Integr Agric 2024', ms: 'J Integr Agric 2024', zh: 'J Integr Agric 2024(中国农业科学英文版)' }, url: 'https://www.chinaagrisci.com/Jwk_zgnykxen/EN/10.1016/j.jia.2024.09.027' }
      ]
    },
    {
      id: 'bamyloliquefaciens',
      weak: true,
      weakWhy: { en: 'One greenhouse result, abstract only, no field trial', ms: 'Satu keputusan rumah hijau, abstrak sahaja, tiada percubaan ladang', zh: '仅一项温室结果,只有摘要,无田间试验' },
      agent: {
        en: 'Bacillus amyloliquefaciens (EB13, SAHA 12.07)',
        ms: 'Bacillus amyloliquefaciens (EB13, SAHA 12.07)',
        zh: '解淀粉芽孢杆菌 (Bacillus amyloliquefaciens)(EB13、SAHA 12.07)'
      },
      level: 2,
      setting: {
        en: 'Greenhouse seedlings (EB13); lab enzyme tests (SAHA 12.07)',
        ms: 'Anak benih rumah hijau (EB13); ujian enzim makmal (SAHA 12.07)',
        zh: '温室幼苗 (EB13);实验室酶活测试 (SAHA 12.07)'
      },
      result: {
        en: 'EB13: disease index fell from 4.0 to 1.8 (palm oil mill effluent alone: 2.3). SAHA 12.07: chitinase broke down the Ganoderma cell wall',
        ms: 'EB13: indeks penyakit turun daripada 4.0 kepada 1.8 (efluen kilang sawit sahaja: 2.3). SAHA 12.07: kitinase memecahkan dinding sel Ganoderma',
        zh: 'EB13:病情指数由 4.0 降至 1.8(仅用棕油厂废水:2.3)。SAHA 12.07:几丁质酶可分解灵芝细胞壁'
      },
      note: {
        en: 'Weaker evidence than Trichoderma, Pseudomonas or Streptomyces: abstracts only, no field trial. Worked when applied before infection. Close relative of B. velezensis.',
        ms: 'Bukti lebih lemah berbanding Trichoderma, Pseudomonas atau Streptomyces: abstrak sahaja, tiada percubaan ladang. Berkesan apabila diberi sebelum jangkitan. Saudara dekat B. velezensis.',
        zh: '证据弱于木霉、假单胞菌或链霉菌:仅有摘要,无田间试验。在感染前施用有效。与贝莱斯芽孢杆菌亲缘很近。'
      },
      sources: [
        { label: { en: 'EB13 + palm oil mill effluent (IOP conference paper)', ms: 'EB13 + efluen kilang sawit (kertas persidangan IOP)', zh: 'EB13 + 棕油厂废水(IOP 会议论文)' }, url: 'https://ouci.dntb.gov.ua/works/42EJAnK7' },
        { label: { en: 'Azizah et al. 2015 (SAHA 12.07)', ms: 'Azizah et al. 2015 (SAHA 12.07)', zh: 'Azizah 等 2015 (SAHA 12.07)' }, url: 'https://scialert.net/fulltext/?doi=jm.2015.452.465' },
        { label: { en: 'Frontiers in Plant Science 2023 review', ms: 'Ulasan Frontiers in Plant Science 2023', zh: 'Frontiers in Plant Science 2023 综述' }, url: 'https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2023.1156869/full' }
      ]
    },
    {
      id: 'ganoef',
      agent: {
        en: 'GanoEF — Hendersonia GanoEF1 (endophytic fungus) in fertiliser',
        ms: 'GanoEF — Hendersonia GanoEF1 (kulat endofit) dalam baja',
        zh: 'GanoEF — Hendersonia GanoEF1(内生真菌)复合肥'
      },
      level: 3,
      setting: {
        en: 'Field trial with treated seedlings, 36 months, as reported by MPOB. The All Cosmos product leaflet also cites a nursery seedling trial (Idris et al. 2012) and a field trial with seedlings (Idris et al. 2014).',
        ms: 'Percubaan ladang dengan anak benih dirawat, 36 bulan, seperti dilaporkan oleh MPOB. Risalah produk All Cosmos turut memetik percubaan anak benih di tapak semaian (Idris et al. 2012) dan percubaan ladang dengan anak benih (Idris et al. 2014).',
        zh: '处理幼苗的田间试验,36 个月,据 MPOB 报告。All Cosmos 产品传单另引用一项苗圃幼苗试验(Idris 等 2012)和一项幼苗园地试验(Idris 等 2014)。'
      },
      result: {
        en: 'MPOB reports 5% of treated palms died from Ganoderma after 36 months. Product leaflet, nursery (Idris et al. 2012): disease incidence 93.3% untreated vs 46.7% treated; dead seedlings 86.7% vs 26.7%; disease reduction 69.5%. Product leaflet, field (Idris et al. 2014): dead seedlings 23.3% untreated vs 0% treated.',
        ms: 'MPOB melaporkan 5% pokok dirawat mati akibat Ganoderma selepas 36 bulan. Risalah produk, tapak semaian (Idris et al. 2012): kejadian penyakit 93.3% tanpa rawatan berbanding 46.7% dirawat; anak benih mati 86.7% berbanding 26.7%; pengurangan penyakit 69.5%. Risalah produk, ladang (Idris et al. 2014): anak benih mati 23.3% tanpa rawatan berbanding 0% dirawat.',
        zh: 'MPOB 报告:36 个月后,处理过的棕树有 5% 死于灵芝病。产品传单,苗圃(Idris 等 2012):病害发生率未处理 93.3%,处理后 46.7%;死苗 86.7% 对 26.7%;病害减少 69.5%。产品传单,园地(Idris 等 2014):死苗未处理 23.3%,处理后 0%。'
      },
      note: {
        en: 'Developed by MPOB with All Cosmos (patent PI 2014701194); in commercial production since June 2012. Awards listed on the leaflet: ITEX 2013 Gold Award, Malaysian Innovative Award, National Intellectual Property Award 2014. The leaflet states that over 3.7% of oil palms in Malaysia (Peninsular Malaysia, Sabah and Sarawak) are infected with basal stem rot. Figures as reported by MPOB SawitSecure and the All Cosmos product leaflet. Leaflet: the Hendersonia strain was identified by CABI, UK; it lives inside oil palm roots, suppressed Ganoderma on culture plates, and raised lignin and defence enzymes (peroxidase, phenylalanine ammonia-lyase, chitinase, glucanase) in the palm.',
        ms: 'Dibangunkan oleh MPOB bersama All Cosmos (paten PI 2014701194); dikeluarkan secara komersial sejak Jun 2012. Anugerah yang disenaraikan dalam risalah: Anugerah Emas ITEX 2013, Malaysian Innovative Award, Anugerah Harta Intelek Negara 2014. Risalah menyatakan lebih 3.7% pokok sawit di Malaysia (Semenanjung, Sabah dan Sarawak) dijangkiti reput pangkal batang. Angka seperti dilaporkan oleh MPOB SawitSecure dan risalah produk All Cosmos. Risalah: strain Hendersonia dikenal pasti oleh CABI, UK; ia hidup di dalam akar sawit, menyekat Ganoderma pada piring kultur, dan meningkatkan lignin serta enzim pertahanan (peroksidase, fenilalanina amonia-liase, kitinase, glukanase) dalam pokok.',
        zh: '由 MPOB 与 All Cosmos 联合开发(专利 PI 2014701194);2012 年 6 月投入商业生产。传单所列奖项:ITEX 2013 金奖、Malaysian Innovative Award、2014 年国家知识产权奖。传单称马来西亚(西马半岛、沙巴和砂拉越)已有超过 3.7% 的油棕感染茎基腐病。数据引自 MPOB SawitSecure 及 All Cosmos 产品传单。传单:Hendersonia 菌株由英国 CABI 鉴定;它寄生于油棕根部,在培养皿中抑制灵芝病菌,并提高油棕的木质素及防御酶(过氧化酶、苯基丙氨酶、几丁质酶、葡聚糖酶)活性。'
      },
      sources: [
        { label: { en: 'MPOB SawitSecure — GanoEF', ms: 'MPOB SawitSecure — GanoEF', zh: 'MPOB SawitSecure — GanoEF' }, url: 'http://sawitsecure.mpob.gov.my/disease-control-and-management/commercial-product-for-preventive-treatment/ganoef-biofertilizer-2/' },
        { label: { en: 'Sawit Indonesia article', ms: 'Artikel Sawit Indonesia', zh: 'Sawit Indonesia 报道' }, url: 'https://sawitindonesia.com/ganoef-biofertilizer-pelindung-akar-sawit-dari-ganoderma/' }
      ]
    },
    {
      id: 'ganocare',
      agent: {
        en: 'GanoCare™ (balanced fertiliser with EFB — not a microbe)',
        ms: 'GanoCare™ (baja seimbang dengan TKS — bukan mikrob)',
        zh: 'GanoCare™(含空果串的平衡肥料 — 非微生物)'
      },
      level: 3,
      setting: {
        en: 'Two separate studies, both on SEEDLINGS (not infected mature palms). (1) Rebitanim et al. 2020, peer-reviewed: nursery with artificial infection; field with 15 bait seedlings per treatment, pretreated 6 months, planted next to infected palms, followed 21 months. (2) MPOB TT No. 564 (2015, OCSpecial): nursery 18 seedlings per treatment, 8 months; field 42 bait seedlings per treatment, 21 months.',
        ms: 'Dua kajian berasingan, kedua-duanya pada ANAK BENIH (bukan pokok matang berpenyakit). (1) Rebitanim et al. 2020, disemak rakan sebidang: tapak semaian dengan jangkitan buatan; ladang dengan 15 anak benih umpan setiap rawatan, pra-rawat 6 bulan, ditanam di sebelah pokok berpenyakit, dipantau 21 bulan. (2) MPOB TT No. 564 (2015, OCSpecial): tapak semaian 18 anak benih setiap rawatan, 8 bulan; ladang 42 anak benih umpan setiap rawatan, 21 bulan.',
        zh: '两项独立研究,均针对幼苗(非已感染的成龄棕树)。(1) Rebitanim 等 2020(同行评审):苗圃人工接种;田间每处理 15 株诱饵苗,预处理 6 个月,种在病株旁,观察 21 个月。(2) MPOB TT No. 564(2015,OCSpecial):苗圃每处理 18 株,8 个月;田间每处理 42 株诱饵苗,21 个月。'
      },
      result: {
        en: '(1) Rebitanim 2020 — nursery: incidence 72.2% vs 100% (77.8% reduction based on AUDPC, not final incidence). Field: incidence 26.7% vs 100%, dead 6.7% vs 93.3% (82.4% AUDPC-based reduction). (2) MPOB TT 564 — nursery: 40% vs 93% infected, 36% vs 90% dead. Field: 4.8% vs 83.3% dead.',
        ms: '(1) Rebitanim 2020 — tapak semaian: insiden 72.2% berbanding 100% (pengurangan 77.8% berasaskan AUDPC, bukan insiden akhir). Ladang: insiden 26.7% berbanding 100%, mati 6.7% berbanding 93.3% (pengurangan 82.4% berasaskan AUDPC). (2) MPOB TT 564 — tapak semaian: 40% berbanding 93% dijangkiti, 36% berbanding 90% mati. Ladang: 4.8% berbanding 83.3% mati.',
        zh: '(1) Rebitanim 2020 — 苗圃:发病率 72.2%,对照 100%(按 AUDPC 计算减少 77.8%,非最终发病率)。田间:发病率 26.7%,对照 100%;死亡 6.7%,对照 93.3%(按 AUDPC 减少 82.4%)。(2) MPOB TT 564 — 苗圃:感染 40%,对照 93%;死亡 36%,对照 90%。田间:死亡 4.8%,对照 83.3%。'
      },
      note: {
        en: 'By MPOB, UPM and FELCRA (patent PI 2012701060, launched 2015). Contains N, P, K, Mg, powdered EFB, Fe, Mn, Cu and Si. MPOB rates — OCSpecial 1 (nursery): 50 g per seedling monthly ×9; OCSpecial 2: 4 kg/palm/year in year 1; OCSpecial 3: 8 kg/palm/year in years 2–3. Contains copper — apply on a different day from microbial products.',
        ms: 'Oleh MPOB, UPM dan FELCRA (paten PI 2012701060, dilancar 2015). Mengandungi N, P, K, Mg, serbuk TKS, Fe, Mn, Cu dan Si. Kadar MPOB — OCSpecial 1 (tapak semaian): 50 g setiap anak benih sebulan sekali ×9; OCSpecial 2: 4 kg/pokok/tahun pada tahun 1; OCSpecial 3: 8 kg/pokok/tahun pada tahun 2–3. Mengandungi kuprum — beri pada hari berlainan daripada produk mikrob.',
        zh: '由 MPOB、UPM 与 FELCRA 联合开发(专利 PI 2012701060,2015 年推出)。含氮、磷、钾、镁、空果串粉及铁、锰、铜、硅。MPOB 用量 — OCSpecial 1(苗圃):每株 50 g,每月一次,共 9 次;OCSpecial 2:第 1 年每株每年 4 kg;OCSpecial 3:第 2–3 年每株每年 8 kg。含铜 — 请与微生物产品分开日期施用。'
      },
      sources: [
        { label: { en: 'Rebitanim et al. 2020, BioMed Res Int (methods, Table 4)', ms: 'Rebitanim et al. 2020, BioMed Res Int (kaedah, Jadual 4)', zh: 'Rebitanim 等 2020, BioMed Res Int(方法,表 4)' }, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7204346/' },
        { label: { en: 'MPOB TT No. 564 (2015) — GanoCare OCSpecial', ms: 'MPOB TT No. 564 (2015) — GanoCare OCSpecial', zh: 'MPOB TT No. 564 (2015) — GanoCare OCSpecial' }, url: 'https://tot.mpob.gov.my/2020/02/17/tt-no-564-chemical-fertiliser-ganocaretm-as-preventive-treatment-in-controlling-ganoderma-disease-of-oil-palm/' },
        { label: { en: 'UPM news — GanoCare commercialised (2015)', ms: 'Berita UPM — GanoCare dikomersialkan (2015)', zh: 'UPM 新闻 — GanoCare 商业化 (2015)' }, url: 'https://web.upm.edu.my/news/produk_kawal_penyakit_pangkal_batang_kelapa_sawit_ganocare_dikomersil-25101' }
      ]
    }
  ];

  const REVIEWS = [
    { label: { en: 'Plant Disease 2022 — BSR pathogen, incidence and control', ms: 'Plant Disease 2022 — patogen, insiden dan kawalan BSR', zh: 'Plant Disease 2022 — 茎基腐病病原、发病情况与防治' }, url: 'https://apsjournals.apsnet.org/doi/10.1094/PDIS-02-22-0358-FE' },
    { label: { en: 'J Fungi 2024 — phytopathogenic Ganoderma review', ms: 'J Fungi 2024 — ulasan Ganoderma patogen tumbuhan', zh: 'J Fungi 2024 — 植物病原灵芝综述' }, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11204718/' },
    { label: { en: 'JOPR review — BSR via biological control agents', ms: 'Ulasan JOPR — kawalan BSR dengan agen kawalan biologi', zh: 'JOPR 综述 — 以生防菌防治茎基腐病' }, url: 'https://jopr.mpob.gov.my/?p=2029' },
    { label: { en: 'Siddiqui et al. 2021 (Warwick)', ms: 'Siddiqui et al. 2021 (Warwick)', zh: 'Siddiqui 等 2021 (Warwick)' }, url: 'https://wrap.warwick.ac.uk/160161/' }
  ];

  // ───────────────────────────────────────────────────────────────────────
  // Where to buy (Malaysia) — web search, November 2026.
  // `for` lists the EVIDENCE ids a product matches. `strainMatch` is true
  // only when the product contains the same strain as the evidence.
  // Prices are listing snapshots and change; the app is not affiliated with
  // any seller.
  // ───────────────────────────────────────────────────────────────────────
  const PRODUCTS = [
    {
      id: 'embio_actinoplus',
      name: 'EMBIO® actinoPLUS',
      for: ['streptomyces'],
      strainMatch: true,
      company: 'Pascal Biotech Sdn Bhd',
      mpob: true,
      price: { en: 'Lazada listing: RM60 for 6 × 300 g (Nov 2026) — confirm with seller', ms: 'Senarai Lazada: RM60 untuk 6 × 300 g (Nov 2026) — sahkan dengan penjual', zh: 'Lazada 标价:6 × 300 g 共 RM60(2026 年 11 月)— 请向卖家确认' },
      contact: '',
      note: {
        en: 'Same strain as the evidence (Streptomyces GanoSA1). Label rates: 50 g per polybag at 3, 6 and 9 months; 250 g at transplanting; 300 g twice a year for palms 1 year and older.',
        ms: 'Strain sama seperti dalam bukti (Streptomyces GanoSA1). Kadar label: 50 g setiap polibag pada umur 3, 6 dan 9 bulan; 250 g semasa pindah tanam; 300 g dua kali setahun untuk pokok berumur 1 tahun ke atas.',
        zh: '与证据中相同的菌株(链霉菌 GanoSA1)。标签用量:3、6、9 月龄时每袋 50 g;移栽时 250 g;1 年以上棕树每年两次,每次 300 g。'
      },
      links: [
        { label: 'Lazada', url: 'https://www.lazada.com.my/products/special-package-rawatan-ganodermakulat-sawit-terbaik-embio-actinoplus-300g-x-6-pack-free-postage-beli-5-percuma-1-i3372089697.html' },
        { label: 'pascal-biotech.com', url: 'https://www.pascal-biotech.com/embio-actinoplus' }
      ]
    },
    {
      id: 'im_bioguard',
      safety: 'pseudomonas', // contains P. aeruginosa — UI shows the safety note
      name: 'iM-bioGuard',
      for: ['pseudomonas_amf', 'bsubtilis_amf'],
      strainMatch: false,
      company: 'IBG Manufacturing Sdn Bhd, Puchong, Selangor',
      mpob: true,
      price: { en: 'No online price — order direct', ms: 'Tiada harga dalam talian — pesan terus', zh: '无网上标价 — 请直接订购' },
      contact: '+603-8066 2875 · info@ibgbiofert.com.my',
      note: {
        en: 'Liquid containing Pseudomonas aeruginosa + Bacillus subtilis, developed with MPOB for Ganoderma prevention. Field trial started 2024 (MPOB). The strain is not stated in the product information.',
        ms: 'Cecair mengandungi Pseudomonas aeruginosa + Bacillus subtilis, dibangunkan bersama MPOB untuk pencegahan Ganoderma. Percubaan ladang bermula 2024 (MPOB). Strain tidak dinyatakan dalam maklumat produk.',
        zh: '含铜绿假单胞菌 + 枯草芽孢杆菌的液剂,与 MPOB 联合开发用于预防灵芝病。2024 年开始田间试验(MPOB)。产品资料未注明菌株。'
      },
      links: [
        { label: 'ibgbiofert.com.my', url: 'https://ibgbiofert.com.my/contact/' }
      ]
    },
    {
      id: 'mycogold',
      name: 'MYCOgold®',
      for: ['pseudomonas_amf', 'amf', 'bsubtilis_amf'],
      strainMatch: false,
      company: 'Malaysian Agri Care Sdn Bhd (MyAgri), Banting',
      price: { en: '1 kg packs; ask for bulk price', ms: 'Pek 1 kg; tanya harga pukal', zh: '1 kg 装;批量请询价' },
      contact: 'Tn Hj Zainal +60 16-223 5096 · Mr Subash +60 16-223 5092',
      note: {
        en: 'Mycorrhiza (AMF), at least 200 spores per 50 g. Used in a UiTM oil palm seedling study.',
        ms: 'Mikoriza (AMF), sekurang-kurangnya 200 spora setiap 50 g. Digunakan dalam kajian anak benih kelapa sawit UiTM.',
        zh: '菌根真菌 (AMF),每 50 g 至少 200 个孢子。曾用于 UiTM 油棕幼苗研究。'
      },
      links: [
        { label: 'MyAgri', url: 'https://myagri2u.wixsite.com/myagri/mycogold-' }
      ]
    },
    {
      id: 'mycospora',
      name: 'MYCOSPORA',
      for: ['amf'],
      strainMatch: false,
      company: 'BPP Agraria',
      price: { en: 'Alibaba listing: about US$15–20 per kg', ms: 'Senarai Alibaba: kira-kira US$15–20 sekilogram', zh: 'Alibaba 标价:约每公斤 15–20 美元' },
      contact: '',
      note: {
        en: '12 AMF species plus other soil microbes. Listing only — not verified.',
        ms: '12 spesies AMF serta mikrob tanah lain. Senarai sahaja — belum disahkan.',
        zh: '12 种丛枝菌根真菌及其他土壤微生物。仅为网上列表 — 未经核实。'
      },
      links: [
        { label: 'Alibaba', url: 'https://www.alibaba.com/mycorrhiza-malaysia-suppliers.html' }
      ]
    },
    {
      id: 'trichoshield',
      name: 'TrichoShield',
      for: ['trichoderma_mix'],
      strainMatch: false,
      company: 'True Trichoderma Technology Sdn Bhd',
      mpob: true,
      price: { en: 'No online price — ask the company or MPOB', ms: 'Tiada harga dalam talian — tanya syarikat atau MPOB', zh: '无网上标价 — 请询问厂商或 MPOB' },
      contact: '',
      note: {
        en: 'MPOB strain Trichoderma virens 159c. MPOB rates: 100 g per hole in main nursery; 1 kg per hole at field planting; mature palms 5 kg of a 1:3 mix with compost every 6 months.',
        ms: 'Strain MPOB Trichoderma virens 159c. Kadar MPOB: 100 g setiap lubang di tapak semaian utama; 1 kg setiap lubang semasa tanam di ladang; pokok matang 5 kg campuran 1:3 dengan kompos setiap 6 bulan.',
        zh: 'MPOB 菌株绿木霉 159c。MPOB 用量:主苗圃每穴 100 g;田间定植每穴 1 kg;成龄棕树每 6 个月施 5 kg(与堆肥按 1:3 混合)。'
      },
      links: [
        { label: 'trichoshield.com', url: 'http://trichoshield.com/company-background.html' },
        { label: 'MPOB SawitSecure', url: 'http://sawitsecure.mpob.gov.my/disease-control-and-management/commercial-product-for-preventive-treatment/trichoshield/' }
      ]
    },
    {
      id: 'palmashield',
      name: 'PalmaShield',
      for: ['trichoderma_local'],
      strainMatch: false,
      company: 'FGV Agri Services Sdn Bhd',
      price: { en: '10 kg pack; see FGV catalogue', ms: 'Pek 10 kg; lihat katalog FGV', zh: '10 kg 装;见 FGV 产品目录' },
      contact: '',
      note: {
        en: 'Trichoderma asperellum M103 — a different isolate from the study (T8R). Lab tests: 93% inhibition of Ganoderma.',
        ms: 'Trichoderma asperellum M103 — isolat berbeza daripada kajian (T8R). Ujian makmal: perencatan Ganoderma 93%.',
        zh: '棘孢木霉 M103 — 与研究中的菌株 (T8R) 不同。实验室测试:对灵芝抑制率 93%。'
      },
      links: [
        { label: 'fgvagri.com', url: 'https://www.fgvagri.com/product-catalogue/palmashield-10kg/' }
      ]
    },
    {
      id: 'ganovacc',
      name: 'Ganovacc',
      for: ['trichoderma_mix'],
      strainMatch: false,
      company: 'Arif Efektif Sdn Bhd',
      price: { en: 'See Shopee listing', ms: 'Lihat senarai Shopee', zh: '见 Shopee 商品页' },
      contact: '',
      note: {
        en: 'Described by the seller as endophytic Trichoderma. Species and spore count are not stated on the listing.',
        ms: 'Diterangkan oleh penjual sebagai Trichoderma endofit. Spesies dan kiraan spora tidak dinyatakan dalam senarai.',
        zh: '卖家描述为内生木霉。商品页未注明菌种和孢子数。'
      },
      links: [
        { label: 'Shopee', url: 'https://shopee.com.my/product/713487412/26233535958' }
      ]
    },
    {
      id: 'ganocare_enquiry',
      name: 'GanoCare™ OCSpecial / GanoCare organic',
      for: ['ganocare'],
      strainMatch: false,
      company: 'MPOB / FELCRA Plantation Services Sdn Bhd',
      mpob: true,
      price: { en: 'No current seller found (Nov 2026) — ask MPOB or FELCRA', ms: 'Tiada penjual semasa ditemui (Nov 2026) — tanya MPOB atau FELCRA', zh: '目前未找到销售渠道(2026 年 11 月)— 请询问 MPOB 或 FELCRA' },
      contact: 'MPOB 03-8769 4400 · Dr Idris Abu Seman, idris@mpob.gov.my · FELCRA Plantation Services, Wisma FELCRA, Jalan Rejang, Setapak, KL',
      note: {
        en: 'Last commercial news is the 2015 launch. Ask whether OCSpecial 1–4 is still produced and who supplies it.',
        ms: 'Berita komersial terakhir ialah pelancaran 2015. Tanya sama ada OCSpecial 1–4 masih dikeluarkan dan siapa pembekalnya.',
        zh: '最近的商业消息是 2015 年的推出。请询问 OCSpecial 1–4 是否仍在生产及由谁供应。'
      },
      links: [
        { label: 'MPOB TT No. 564', url: 'https://tot.mpob.gov.my/2020/02/17/tt-no-564-chemical-fertiliser-ganocaretm-as-preventive-treatment-in-controlling-ganoderma-disease-of-oil-palm/' }
      ]
    },
    {
      id: 'snt_probiotein',
      untested: true,
      name: 'SNT Super Probiotein Plus',
      for: ['bvelezensis', 'bamyloliquefaciens'],
      strainMatch: false,
      company: 'TwinArrow / SNT (双箭肥料 · 先利德)',
      price: { en: 'Ask your fertiliser shop or an SNT representative', ms: 'Tanya kedai baja anda atau wakil SNT', zh: '请向肥料店或 SNT 代表询问' },
      contact: '',
      note: {
        en: 'Liquid microbial fertiliser (plant & soil booster) containing Bacillus velezensis + B. amyloliquefaciens. Strains and CFU not stated. Sold as a soil-health product; no Ganoderma trial listed. Source: local supplier information, not found online.',
        ms: 'Baja mikrob cecair (penggalak tanaman & tanah) mengandungi Bacillus velezensis + B. amyloliquefaciens. Strain dan CFU tidak dinyatakan. Dijual sebagai produk kesihatan tanah; tiada percubaan Ganoderma disenaraikan. Sumber: maklumat pembekal tempatan, tiada dalam talian.',
        zh: '液体微生物肥料(植物与土壤增强剂),含贝莱斯芽孢杆菌 + 解淀粉芽孢杆菌。未注明菌株与菌落数。作为土壤健康产品销售;未列出灵芝病试验。来源:本地供应商信息,网上未查到。'
      },
      links: []
    },
    {
      id: 'lvlong_velezensis',
      untested: true,
      name: 'LV LONG (绿陇) Bacillus velezensis product',
      for: ['bvelezensis'],
      strainMatch: false,
      company: 'LV LONG (绿陇)',
      price: { en: 'Ask your agrochemical or fertiliser shop', ms: 'Tanya kedai racun atau baja anda', zh: '请向农药/肥料店询问' },
      contact: '',
      note: {
        en: 'Product name and strain not confirmed. Source: local supplier information, not found online.',
        ms: 'Nama produk dan strain belum disahkan. Sumber: maklumat pembekal tempatan, tiada dalam talian.',
        zh: '产品名称与菌株未确认。来源:本地供应商信息,网上未查到。'
      },
      links: []
    },
    {
      id: 'serenade_sc',
      untested: true,
      name: 'Serenade® SC (Bayer)',
      for: ['bamyloliquefaciens'],
      strainMatch: false,
      company: 'Bayer',
      price: { en: 'Ask your agrochemical shop or Bayer Malaysia', ms: 'Tanya kedai racun anda atau Bayer Malaysia', zh: '请向农药店或 Bayer 马来西亚询问' },
      contact: '',
      note: {
        en: 'B. amyloliquefaciens QST 713 (formerly B. subtilis), a registered biofungicide in many countries. Malaysian registration not confirmed online — check with the supplier. No Ganoderma trial listed.',
        ms: 'B. amyloliquefaciens QST 713 (dahulu B. subtilis), racun kulat biologi berdaftar di banyak negara. Pendaftaran Malaysia belum disahkan dalam talian — semak dengan pembekal. Tiada percubaan Ganoderma disenaraikan.',
        zh: '解淀粉芽孢杆菌 QST 713(旧称枯草芽孢杆菌),多国登记的生物杀菌剂。网上未能确认马来西亚登记 — 请向供应商确认。未列出灵芝病试验。'
      },
      links: []
    },
    {
      id: 'ganoef_product',
      name: 'GanoEF (Real Strong)',
      for: ['ganoef'],
      strainMatch: true,
      company: 'All Cosmos Industries Sdn Bhd, PLO 650, Jalan Keluli 7, Pasir Gudang Industrial Estate, 81700 Pasir Gudang, Johor',
      mpob: true,
      price: { en: 'Lazada listing: RM84 per 20 kg (Nov 2026)', ms: 'Senarai Lazada: RM84 setiap 20 kg (Nov 2026)', zh: 'Lazada 标价:每 20 kg RM84(2026 年 11 月)' },
      contact: '+607-252 3788 · sales_marketing@allcosmos.com',
      note: {
        en: 'Leaflet rates: nursery 50 g per seedling at first re-bagging, again 3 months later, and again 3 months after that; 500 g per planting hole; young palms (under 4 years) 2 kg per palm per year; mature palms (over 4 years) 4 kg per palm per year. Cover with soil after applying — do not leave it exposed to the sun. 4-in-1: Hendersonia with chitin, organic matter, effective microorganisms, and chemical nutrients (17 major and trace elements). Leaflet specification: Hendersonia at least 10⁴ CFU per gram, a small amount of N-P-K plus trace elements, pH 5.0–8.0, moisture 25% or less, organic matter 30% or more, C/N 10 or more. Store cool and dry, out of direct sunlight; white spots on the surface do not affect quality; use within 12 months of manufacture; wash hands after use. Also sold by Guan Chong Agro, Melaka.',
        ms: 'Kadar risalah: tapak semaian 50 g setiap anak benih semasa tukar polibeg pertama, sekali lagi 3 bulan kemudian, dan sekali lagi 3 bulan selepas itu; 500 g setiap lubang tanam; pokok muda (bawah 4 tahun) 2 kg setiap pokok setahun; pokok matang (lebih 4 tahun) 4 kg setiap pokok setahun. Tutup dengan tanah selepas menabur — jangan biarkan terdedah kepada matahari. 4 dalam 1: Hendersonia dengan kitin, bahan organik, mikroorganisma berfaedah, dan nutrien kimia (17 unsur utama dan surih). Spesifikasi risalah: Hendersonia sekurang-kurangnya 10⁴ CFU setiap gram, sedikit N-P-K serta unsur surih, pH 5.0–8.0, lembapan 25% atau kurang, bahan organik 30% atau lebih, C/N 10 atau lebih. Simpan di tempat sejuk dan kering, jauh daripada cahaya matahari terus; tompok putih pada permukaan tidak menjejaskan mutu; guna dalam 12 bulan dari tarikh pengeluaran; basuh tangan selepas guna. Juga dijual oleh Guan Chong Agro, Melaka.',
        zh: '传单用量:苗圃每株 50 克,首次更换塑料袋时施一次,3 个月后再施,再过 3 个月施第三次;每定植穴 500 克;幼龄树(4 年以下)每株每年 2 公斤;成年树(4 年以上)每株每年 4 公斤。施用后必须覆土,不可在阳光下暴晒。4 合 1:Hendersonia 加甲壳素、有机物质、有效微生物、化学养分(17 种大量和微量元素)。传单规格:Hendersonia 菌群每克 10⁴ CFU 以上,少量 N-P-K 及微量元素,pH 5.0–8.0,水分 25% 以下,有机物 30% 以上,C/N 10 以上。存放于阴凉干燥处,避免阳光直射;表面出现白色斑点不影响质量;自生产之日起 12 个月内有效;使用后请洗手。马六甲 Guan Chong Agro 亦有售。'
      },
      links: [
        { label: 'Lazada', url: 'https://www.lazada.com.my/products/real-strong-mpob-ganoef-20kg-oil-palm-ganoderma-solution-baja-kulat-untuk-penyakit-cendawan-kelapa-sawit-i2915933847.html' },
        { label: 'Guan Chong Agro', url: 'https://www.guanchongagro.com/showproducts/productid/5392878/cid/563317/realstrong-gano-ef-20kg/' },
        { label: 'allcosmos.com', url: 'https://allcosmos.com/en/bio-control-fertilisers/128-ganoef-4-in-1-biofertilizer' }
      ]
    }
  ];

  /** Products that match one evidence entry (strain matches first). */
  function productsFor(evidenceId) {
    return PRODUCTS.filter(function (p) { return p.for.includes(evidenceId); })
      .sort(function (a, b) {
        // same-strain products first, products not tested on Ganoderma last
        return (Number(b.strainMatch) - Number(a.strainMatch)) || (Number(!!a.untested) - Number(!!b.untested));
      });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Export
  // ───────────────────────────────────────────────────────────────────────
  /** CSV of all censuses across blocks. */
  function blocksToCsv(blocks) {
    const header = ['block', 'role', 'date', 'healthy', 'early', 'moderate', 'severe', 'dead', 'n', 'incidence_pct', 'dsi_pct'];
    const lines = [header.join(',')];
    (blocks || []).forEach(function (b) {
      summariseBlock(b).rows.forEach(function (r) {
        const counts = b.censuses.find(function (c) { return c.date === r.date; }).counts;
        lines.push([csvCell(b.name), csvCell(b.role || ''), r.date].concat(counts, [r.n, fmtNum(r.incidence), fmtNum(r.dsi)]).join(','));
      });
    });
    return lines.join('\n') + '\n';
  }

  /**
   * Validate a whole backup file BEFORE anything is changed (review fix).
   * All-or-nothing: if any block or census is invalid, `ok` is false,
   * `blocks` is empty and `errors` lists every problem, so the caller can
   * report them and leave saved records untouched.
   * @param {string} text  file contents
   * @returns {{ok:boolean, blocks:object[], errors:{index:number|null, name:string, code:string, detail:string}[]}}
   */
  function parseBackup(text) {
    const errors = [];
    function err(index, name, code, detail) { errors.push({ index: index, name: name || '', code: code, detail: detail == null ? '' : String(detail) }); }
    let d;
    try { d = JSON.parse(text); } catch (e) { err(null, '', 'json'); return { ok: false, blocks: [], errors: errors }; }
    if (!d || !Array.isArray(d.blocks) || d.blocks.length === 0) {
      err(null, '', 'noBlocks');
      return { ok: false, blocks: [], errors: errors };
    }
    const ROLES = ['treated', 'control', 'monitor'];
    const blocks = [];
    d.blocks.forEach(function (b, i) {
      const n = i + 1;
      if (!b || typeof b !== 'object') { err(n, '', 'block'); return; }
      const name = typeof b.name === 'string' ? b.name.trim() : '';
      if (!name) err(n, '', 'name');
      if (b.role != null && !ROLES.includes(b.role)) err(n, name, 'role', b.role);
      if (!Array.isArray(b.censuses)) { err(n, name, 'censuses'); return; }
      const seen = {};
      b.censuses.forEach(function (c, j) {
        const date = c && c.date;
        try { parseDate(date); } catch (e) { err(n, name, 'date', date == null ? '#' + (j + 1) : date); return; }
        if (seen[date]) err(n, name, 'dupDate', date);
        seen[date] = true;
        try { summariseCensus(c.counts); } catch (e) { err(n, name, 'counts', date); }
      });
      blocks.push({
        id: typeof b.id === 'string' && b.id ? b.id : null,
        name: name,
        role: b.role == null ? 'monitor' : b.role,
        censuses: b.censuses.map(function (c) { return { date: c && c.date, counts: c && c.counts }; })
      });
    });
    return errors.length ? { ok: false, blocks: [], errors: errors } : { ok: true, blocks: blocks, errors: [] };
  }

  function csvCell(s) {
    const str = String(s);
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  }
  function fmtNum(v) { return v == null ? '' : String(v); }

  // ───────────────────────────────────────────────────────────────────────
  // Date / number helpers (UTC so results never shift with time zone)
  // ───────────────────────────────────────────────────────────────────────
  const DAY_MS = 86400000;

  /**
   * RangeError with a stable `code` (and the offending `value`) so the UI can
   * show a translated message: i18n key 'err.<code>'. The English message is
   * kept for developers and tests.
   */
  function fail(code, message, value) {
    const e = new RangeError(message);
    e.code = code;
    if (value !== undefined) e.value = value;
    return e;
  }
  const ERROR_CODES = ['lesion', 'foliar', 'counts', 'reduction', 'setting', 'stage', 'horizon',
    'palms', 'batchKg', 'failureRate', 'leadDays', 'date'];

  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) throw fail('date', 'date must be YYYY-MM-DD: ' + s, s);
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (formatDate(new Date(t)) !== s) throw fail('date', 'invalid calendar date: ' + s, s);
    return t;
  }

  function formatDate(d) {
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function round(v, dp) { const f = Math.pow(10, dp); return Math.round(v * f) / f; }


  // ───────────────────────────────────────────────────────────────────────
  // Scientific names in italics (botanical/bacteriological convention):
  // genus and species epithets italic; "sp./spp.", strain codes (T32,
  // UPMP3), product names (GanoEF, GanoCare) and Chinese/Malay common
  // names stay upright. Works on ALREADY-ESCAPED HTML text and only adds
  // <i> tags, so it is safe to use on user-facing strings.
  // ───────────────────────────────────────────────────────────────────────
  const SCI_GENERA = ['Trichoderma', 'Ganoderma', 'Pseudomonas', 'Bacillus', 'Streptomyces', 'Glomus',
    'Hendersonia', 'Rigidoporus', 'Pythium', 'Elaeis', 'Serratia', 'Margalitia', 'Gigaspora', 'Acaulospora',
    'Scutellospora', 'Phlebia', 'Scytalidium', 'Burkholderia'];
  // Epithets are listed explicitly so ordinary words after a genus
  // ("Trichoderma rice-grain", "Bacillus product") are never italicised.
  const SCI_EPITHETS = ['harzianum', 'asperellum', 'virens', 'viride', 'boninense', 'pseudoferreum', 'zonatum',
    'aeruginosa', 'fluorescens', 'intraradices', 'clarum', 'etunicatum', 'subtilis', 'velezensis',
    'amyloliquefaciens', 'palmae', 'griseus', 'nigrogriseolus', 'oligandrum', 'lignosus', 'guineensis',
    'marcescens', 'shackletonii', 'parasiticum', 'rosea', 'morrowiae', 'heterogama'];
  const SCI_RE = new RegExp(
    '\\b(?:(?:' + SCI_GENERA.join('|') + ')(?: (?:' + SCI_EPITHETS.join('|') + ')\\b)?' +
    '|[A-Z]\\. (?:' + SCI_EPITHETS.join('|') + ')\\b)', 'g');

  /** Wrap scientific names in <i>…</i>. Input must already be HTML-escaped. */
  function italicizeSci(escapedHtml) {
    return String(escapedHtml).replace(SCI_RE, function (m) { return '<i>' + m + '</i>'; });
  }

  return {
    STAGES: STAGES,
    italicizeSci: italicizeSci,
    ERROR_CODES: ERROR_CODES,
    TRICHO_KG: TRICHO_KG,
    EVIDENCE: EVIDENCE,
    REVIEWS: REVIEWS,
    PRODUCTS: PRODUCTS,
    productsFor: productsFor,
    classifyPalm: classifyPalm,
    summariseCensus: summariseCensus,
    audpc: audpc,
    audpcBetween: audpcBetween,
    diseaseReduction: diseaseReduction,
    summariseBlock: summariseBlock,
    compareTrial: compareTrial,
    buildPlan: buildPlan,
    batchAgents: batchAgents,
    stepBasis: stepBasis,
    findChemicalConflicts: findChemicalConflicts,
    planBrews: planBrews,
    blocksToCsv: blocksToCsv,
    parseBackup: parseBackup,
    parseDate: parseDate,
    formatDate: formatDate
  };
});
