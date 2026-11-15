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
      throw new RangeError('lesionPct must be between 0 and 100');
    }
    const foliar = o.foliar || 'none';
    if (!['none', 'mild', 'severe'].includes(foliar)) {
      throw new RangeError('foliar must be none, mild or severe');
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
      throw new RangeError('counts must be an array of 5 numbers (classes 0–4)');
    }
    counts.forEach(function (c) {
      if (!Number.isInteger(c) || c < 0) throw new RangeError('counts must be non-negative integers');
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
      throw new RangeError('control and treated must be non-negative numbers');
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
    if (!SETTINGS.includes(o.setting)) throw new RangeError('setting must be mature, replant or nursery');
    let tpl = TEMPLATES[o.setting];
    let stage = null;
    if (o.setting === 'mature') {
      stage = Number(o.stage);
      if (!Number.isInteger(stage) || stage < 0 || stage > MAX_CLASS) {
        throw new RangeError('stage must be an integer 0–4 for mature palms');
      }
      tpl = tpl[stage];
    }
    const start = parseDate(o.startDate);
    const horizon = o.horizonWeeks == null ? DEFAULT_HORIZON[o.setting] : Number(o.horizonWeeks);
    if (!Number.isInteger(horizon) || horizon < 1 || horizon > 520) {
      throw new RangeError('horizonWeeks must be an integer 1–520');
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
    if (!Number.isInteger(palms) || palms < 1) throw new RangeError('palms must be a positive integer');
    if (!(o.batchKg > 0)) throw new RangeError('batchKg must be > 0');
    if (!(o.failureRate >= 0 && o.failureRate < 1)) throw new RangeError('failureRate must be in [0, 1)');
    if (o.leadDays >= o.shelfDays) throw new RangeError('leadDays must be shorter than shelfDays');

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
  //        1 = lab plate or related host only · 0 = no evidence found
  // ───────────────────────────────────────────────────────────────────────
  const EVIDENCE = [
    {
      id: 'pseudomonas_amf',
      agent: 'Pseudomonas aeruginosa UPMP3 + Glomus intraradices / G. clarum (AMF)',
      level: 3,
      setting: 'Nursery + 20-month bait-seedling field trial',
      result: 'BSR reduced by 57% (nursery) and 80% (field)',
      note: 'Best field result found for a microbial combination. P. aeruginosa is an opportunistic human pathogen — use only registered products, wear gloves/mask.',
      sources: [
        { label: 'Sundram et al. 2015 (AGRIS)', url: 'https://agris.fao.org/search/en/records/65de6bf2b766d82b18fd663f' },
        { label: 'MPOB iM-bioGuard field trial news', url: 'https://prestasisawit.mpob.gov.my/en/palmnews/news/36479' }
      ]
    },
    {
      id: 'trichoderma_mix',
      agent: 'Trichoderma harzianum + T. asperellum + T. virens (mixture)',
      level: 2,
      setting: 'Seedlings, glasshouse',
      result: 'Foliar symptoms −83%, bole symptoms −89%',
      note: 'Most-studied BCA group. Protects only at very early infection; field results inconsistent.',
      sources: [
        { label: 'JOPR 2018, 30(3):403–415', url: 'https://jopr.mpob.gov.my/?p=8761' },
        { label: 'JOPR (Habu) — early-stage only', url: 'https://jopr.mpob.gov.my/wp-content/uploads/2018/09/jopr2018inpress-habu.pdf' }
      ]
    },
    {
      id: 'trichoderma_local',
      agent: 'Local T. virens / T. asperellum isolates (singly or combined)',
      level: 2,
      setting: 'Seedlings',
      result: 'Disease reduced 42–58%, comparable to two commercial biocontrol products',
      note: 'Isolates T4RH (T. virens) and T8R (T. asperellum) selected from 20.',
      sources: [
        { label: 'JOPR 2025', url: 'https://jopr.mpob.gov.my/?p=14135' },
        { label: 'UMS eprint 43960', url: 'https://eprints.ums.edu.my/id/eprint/43960' },
        { label: 'Sarhad J Agric 2024 (UMS)', url: 'https://eprints.ums.edu.my/id/eprint/42344' }
      ]
    },
    {
      id: 'trichoderma_harzianum',
      agent: 'Trichoderma harzianum (FA 1132, T32) ± AMF, in compost',
      level: 2,
      setting: 'Glasshouse; field trial measured growth only',
      result: 'T32: 60% seedling survival vs 0% control; T. harzianum compost: 100% BSR reduction (glasshouse)',
      note: 'EFB compost and bran recommended as field carriers.',
      sources: [
        { label: 'UPM eprint 9095', url: 'https://libmast.utm.my/Record/upm.eprints-9095/Description' },
        { label: 'UPM eprint 32011', url: 'https://libmast.utm.my/Record/upm.eprints-32011/Description' },
        { label: 'Trichoderma + mycorrhizae (ResearchGate)', url: 'https://www.researchgate.net/publication/358340736_Potential_of_Trichoderma_and_mycorrhizae_as_biological_agents_for_controlling_Ganoderma_boninense_in_oil_palm' }
      ]
    },
    {
      id: 'streptomyces',
      agent: 'Streptomyces spp. (AGA347, S. palmae CMU-AB204T, GanoSA1)',
      level: 2,
      setting: 'Glasshouse seedlings',
      result: 'AGA347 formulation reduced BSR 73.1%; GanoSA1 induces defence enzymes (PAL, POX, PPO, β-glucanase)',
      note: 'Shelf life of formulations still a problem. Not S. griseus specifically.',
      sources: [
        { label: 'World J Microbiol Biotechnol 2017', url: 'https://springerlink.bibliotecabuap.elogim.com/doi/10.1007/s11274-017-2396-1' },
        { label: 'JOPR 2023 (GanoSA1)', url: 'https://jopr.mpob.gov.my/?p=12357' },
        { label: 'Japanis et al. 2021 (combinations)', url: 'https://libmast.utm.my/Record/ums.eprints-26711/Description' }
      ]
    },
    {
      id: 'bsubtilis_amf',
      agent: 'Bacillus subtilis B10 + AMF',
      level: 2,
      setting: 'Greenhouse seedlings (Indonesia)',
      result: 'Lower BSR incidence, better height and P uptake',
      note: '',
      sources: [
        { label: 'IPB repository', url: 'https://repository.ipb.ac.id/handle/123456789/52916' },
        { label: 'Microbiology Indonesia 2013', url: 'https://doaj.org/article/22447d82b6214e18b10240625461e83e' }
      ]
    },
    {
      id: 'amf',
      agent: 'Arbuscular mycorrhizal fungi (Glomus spp.) alone',
      level: 2,
      setting: 'Nursery (24 months)',
      result: 'Lowest DSI 51% at 5 g AMF/bag; growth differences not significant early on',
      note: 'Works better in combinations than alone.',
      sources: [
        { label: 'MPOB — Ganoderma versus mycorrhiza', url: 'https://opb.mpob.gov.my/ganoderma-versus-mycorrhiza/' }
      ]
    },
    {
      id: 'bvelezensis',
      agent: 'Bacillus velezensis',
      level: 1,
      setting: 'Rubber tree (related pathogen G. pseudoferreum)',
      result: 'SF305: ~70% curative, >90% preventive efficacy against red root rot',
      note: 'No direct data on G. boninense in oil palm found.',
      sources: [
        { label: 'J Integr Agric 2024', url: 'https://www.chinaagrisci.com/Jwk_zgnykxen/EN/10.1016/j.jia.2024.09.027' }
      ]
    },
    {
      id: 'pythium',
      agent: 'Pythium oligandrum',
      level: 0,
      setting: '—',
      result: 'No Ganoderma study found',
      note: 'Do not rely on it for BSR.',
      sources: [
        { label: 'Wikipedia overview', url: 'https://en.wikipedia.org/wiki/Pythium_oligandrum' }
      ]
    },
    {
      id: 'ganocare',
      agent: 'GanoCare® (EFB-based mineral product — not a microbe)',
      level: 3,
      setting: 'Nursery + 21-month bait-seedling field trial',
      result: 'Field incidence 26.7% vs 100% control; dead seedlings 6.7% vs 93.3%; AUDPC reduction 82%',
      note: 'Useful nutrition-only comparison arm. Applied 30 g every 3 months.',
      sources: [
        { label: 'Rebitanim et al. 2020, BioMed Res Int', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7204346/' }
      ]
    }
  ];

  const REVIEWS = [
    { label: 'Plant Disease 2022 — BSR pathogen, incidence and control', url: 'https://apsjournals.apsnet.org/doi/10.1094/PDIS-02-22-0358-FE' },
    { label: 'J Fungi 2024 — phytopathogenic Ganoderma review', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11204718/' },
    { label: 'JOPR review — BSR via biological control agents', url: 'https://jopr.mpob.gov.my/?p=2029' },
    { label: 'Siddiqui et al. 2021 (Warwick)', url: 'https://wrap.warwick.ac.uk/160161/' }
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

  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) throw new RangeError('date must be YYYY-MM-DD: ' + s);
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (formatDate(new Date(t)) !== s) throw new RangeError('invalid calendar date: ' + s);
    return t;
  }

  function formatDate(d) {
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function round(v, dp) { const f = Math.pow(10, dp); return Math.round(v * f) / f; }

  return {
    STAGES: STAGES,
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
