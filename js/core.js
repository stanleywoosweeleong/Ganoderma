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
   * Compare a treated block against an untreated control block.
   * Uses the latest census of each block plus AUDPC over all censuses.
   */
  function compareTrial(controlBlock, treatedBlock) {
    const c = summariseBlock(controlBlock);
    const t = summariseBlock(treatedBlock);
    function red(a, b) { return a == null || b == null ? null : diseaseReduction(a, b); }
    return {
      control: c,
      treated: t,
      reduction: {
        incidence: red(c.latest && c.latest.incidence, t.latest && t.latest.incidence),
        dsi: red(c.latest && c.latest.dsi, t.latest && t.latest.dsi),
        audpcIncidence: red(c.audpcIncidence, t.audpcIncidence),
        audpcDsi: red(c.audpcDsi, t.audpcDsi)
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
  // ───────────────────────────────────────────────────────────────────────
  // Text fields are { en, ms, zh }. Scientific names stay in Latin; paper
  // titles / journal names stay as published.
  const EVIDENCE = [
    {
      id: 'pseudomonas_amf',
      agent: {
        en: 'Pseudomonas aeruginosa UPMP3 + Glomus intraradices / G. clarum (AMF)',
        ms: 'Pseudomonas aeruginosa UPMP3 + Glomus intraradices / G. clarum (AMF)',
        zh: '铜绿假单胞菌 (Pseudomonas aeruginosa) UPMP3 + 根内球囊霉 / 明球囊霉 (AMF 菌根真菌)'
      },
      level: 3,
      setting: {
        en: 'Nursery + 20-month bait-seedling field trial',
        ms: 'Tapak semaian + percubaan ladang anak benih umpan selama 20 bulan',
        zh: '苗圃 + 为期 20 个月的田间诱饵苗试验'
      },
      result: {
        en: 'BSR reduced by 57% (nursery) and 80% (field)',
        ms: 'BSR berkurang 57% (tapak semaian) dan 80% (ladang)',
        zh: '茎基腐病减少 57%(苗圃)和 80%(田间)'
      },
      note: {
        en: 'Best field result found for a microbial combination. P. aeruginosa is an opportunistic human pathogen — use only registered products, wear gloves/mask.',
        ms: 'Keputusan ladang terbaik bagi gabungan mikrob. P. aeruginosa ialah patogen oportunis manusia — guna produk berdaftar sahaja, pakai sarung tangan/topeng.',
        zh: '目前微生物组合中最好的田间结果。铜绿假单胞菌是人类机会性病原菌 — 只使用已登记产品,并戴手套/口罩。'
      },
      sources: [
        { label: { en: 'Sundram et al. 2015 (AGRIS)', ms: 'Sundram et al. 2015 (AGRIS)', zh: 'Sundram 等 2015 (AGRIS)' }, url: 'https://agris.fao.org/search/en/records/65de6bf2b766d82b18fd663f' },
        { label: { en: 'MPOB iM-bioGuard field trial news', ms: 'Berita percubaan ladang iM-bioGuard MPOB', zh: 'MPOB iM-bioGuard 田间试验新闻' }, url: 'https://prestasisawit.mpob.gov.my/en/palmnews/news/36479' }
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
      setting: { en: 'Seedlings, glasshouse', ms: 'Anak benih, rumah kaca', zh: '幼苗,温室' },
      result: {
        en: 'Foliar symptoms −83%, bole symptoms −89%',
        ms: 'Simptom daun −83%, simptom pangkal batang −89%',
        zh: '叶部症状减少 83%,茎基症状减少 89%'
      },
      note: {
        en: 'Most-studied BCA group. Protects only at very early infection; field results inconsistent.',
        ms: 'Kumpulan agen kawalan biologi paling banyak dikaji. Melindungi hanya pada jangkitan sangat awal; keputusan ladang tidak konsisten.',
        zh: '研究最多的生防菌类群。仅在感染极早期有保护作用;田间结果不稳定。'
      },
      sources: [
        { label: { en: 'JOPR 2018, 30(3):403–415', ms: 'JOPR 2018, 30(3):403–415', zh: 'JOPR 2018, 30(3):403–415' }, url: 'https://jopr.mpob.gov.my/?p=8761' },
        { label: { en: 'JOPR (Habu) — early-stage only', ms: 'JOPR (Habu) — peringkat awal sahaja', zh: 'JOPR (Habu) — 仅早期有效' }, url: 'https://jopr.mpob.gov.my/wp-content/uploads/2018/09/jopr2018inpress-habu.pdf' }
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
      setting: { en: 'Seedlings', ms: 'Anak benih', zh: '幼苗' },
      result: {
        en: 'Disease reduced 42–58%, comparable to two commercial biocontrol products',
        ms: 'Penyakit berkurang 42–58%, setanding dengan dua produk kawalan biologi komersial',
        zh: '病害减少 42–58%,与两种商业生防产品相当'
      },
      note: {
        en: 'Isolates T4RH (T. virens) and T8R (T. asperellum) selected from 20.',
        ms: 'Isolat T4RH (T. virens) dan T8R (T. asperellum) dipilih daripada 20 isolat.',
        zh: '菌株 T4RH(绿木霉)和 T8R(棘孢木霉)从 20 个菌株中筛选而出。'
      },
      sources: [
        { label: { en: 'JOPR 2025', ms: 'JOPR 2025', zh: 'JOPR 2025' }, url: 'https://jopr.mpob.gov.my/?p=14135' },
        { label: { en: 'UMS eprint 43960', ms: 'UMS eprint 43960', zh: 'UMS 论文库 43960' }, url: 'https://eprints.ums.edu.my/id/eprint/43960' },
        { label: { en: 'Sarhad J Agric 2024 (UMS)', ms: 'Sarhad J Agric 2024 (UMS)', zh: 'Sarhad J Agric 2024 (UMS)' }, url: 'https://eprints.ums.edu.my/id/eprint/42344' }
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
        en: 'Arbuscular mycorrhizal fungi (Glomus spp.) alone',
        ms: 'Kulat mikoriza arbuskular (Glomus spp.) sahaja',
        zh: '丛枝菌根真菌(球囊霉属 Glomus)单独使用'
      },
      level: 2,
      setting: { en: 'Nursery (24 months)', ms: 'Tapak semaian (24 bulan)', zh: '苗圃(24 个月)' },
      result: {
        en: 'Lowest DSI 51% at 5 g AMF/bag; growth differences not significant early on',
        ms: 'DSI terendah 51% pada 5 g AMF/beg; perbezaan pertumbuhan tidak ketara pada awalnya',
        zh: '每袋 5 g 菌根真菌时病情指数最低,为 51%;前期生长差异不显著'
      },
      note: {
        en: 'Works better in combinations than alone.',
        ms: 'Lebih berkesan dalam gabungan berbanding digunakan sendiri.',
        zh: '组合使用比单独使用效果更好。'
      },
      sources: [
        { label: { en: 'MPOB — Ganoderma versus mycorrhiza', ms: 'MPOB — Ganoderma lawan mikoriza', zh: 'MPOB — 灵芝 vs 菌根真菌' }, url: 'https://opb.mpob.gov.my/ganoderma-versus-mycorrhiza/' }
      ]
    },
    {
      id: 'bvelezensis',
      agent: { en: 'Bacillus velezensis', ms: 'Bacillus velezensis', zh: '贝莱斯芽孢杆菌 (Bacillus velezensis)' },
      level: 1,
      setting: {
        en: 'Rubber tree (related pathogen G. pseudoferreum)',
        ms: 'Pokok getah (patogen berkaitan G. pseudoferreum)',
        zh: '橡胶树(近缘病原菌 G. pseudoferreum)'
      },
      result: {
        en: 'SF305: ~70% curative, >90% preventive efficacy against red root rot',
        ms: 'SF305: keberkesanan ~70% merawat, >90% mencegah penyakit reput akar merah',
        zh: 'SF305:对红根腐病治疗效果约 70%,预防效果超过 90%'
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
      id: 'ganocare',
      agent: {
        en: 'GanoCare® (EFB-based mineral product — not a microbe)',
        ms: 'GanoCare® (produk mineral berasaskan TKS — bukan mikrob)',
        zh: 'GanoCare®(以空果串为基础的矿物产品 — 非微生物)'
      },
      level: 3,
      setting: {
        en: 'Nursery + 21-month bait-seedling field trial',
        ms: 'Tapak semaian + percubaan ladang anak benih umpan selama 21 bulan',
        zh: '苗圃 + 为期 21 个月的田间诱饵苗试验'
      },
      result: {
        en: 'Field incidence 26.7% vs 100% control; dead seedlings 6.7% vs 93.3%; AUDPC reduction 82%',
        ms: 'Insiden ladang 26.7% berbanding 100% kawalan; anak benih mati 6.7% berbanding 93.3%; pengurangan AUDPC 82%',
        zh: '田间发病率 26.7%,对照为 100%;幼苗死亡 6.7%,对照为 93.3%;AUDPC 减少 82%'
      },
      note: {
        en: 'Useful nutrition-only comparison arm. Applied 30 g every 3 months.',
        ms: 'Berguna sebagai rawatan perbandingan nutrisi sahaja. Diberi 30 g setiap 3 bulan.',
        zh: '可作为仅营养处理的对比组。每 3 个月施用 30 g。'
      },
      sources: [
        { label: { en: 'Rebitanim et al. 2020, BioMed Res Int', ms: 'Rebitanim et al. 2020, BioMed Res Int', zh: 'Rebitanim 等 2020, BioMed Res Int' }, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7204346/' }
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

  return {
    STAGES: STAGES,
    ERROR_CODES: ERROR_CODES,
    TRICHO_KG: TRICHO_KG,
    EVIDENCE: EVIDENCE,
    REVIEWS: REVIEWS,
    classifyPalm: classifyPalm,
    summariseCensus: summariseCensus,
    audpc: audpc,
    diseaseReduction: diseaseReduction,
    summariseBlock: summariseBlock,
    compareTrial: compareTrial,
    buildPlan: buildPlan,
    findChemicalConflicts: findChemicalConflicts,
    planBrews: planBrews,
    blocksToCsv: blocksToCsv,
    parseDate: parseDate,
    formatDate: formatDate
  };
});
