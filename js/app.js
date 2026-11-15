/* Ganoderma BSR Manager — browser UI. Logic lives in core.js (tested). */
(function () {
  'use strict';
  const G = window.GanoCore;
  const I = window.GanoI18n;
  const t = I.t;
  const $ = function (id) { return document.getElementById(id); };
  const STORE_KEY = 'gbsr.v1';

  // ── State & storage (per-device; wrapped so the app works without it) ──
  const state = { lang: 'en', tab: 'assess', plan: null, blocks: [] };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        if (['en', 'ms', 'zh'].includes(d.lang)) state.lang = d.lang;
        if (Array.isArray(d.blocks)) state.blocks = d.blocks.filter(validBlock);
        if (typeof d.tab === 'string') state.tab = d.tab;
      }
    } catch (e) { /* storage unavailable or corrupt — start fresh */ }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ lang: state.lang, tab: state.tab, blocks: state.blocks }));
    } catch (e) { /* ignore */ }
  }
  function validBlock(b) {
    if (!b || typeof b.name !== 'string' || !Array.isArray(b.censuses)) return false;
    try {
      b.censuses.forEach(function (c) { G.parseDate(c.date); G.summariseCensus(c.counts); });
      return true;
    } catch (e) { return false; }
  }

  // ── Helpers ──
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function today() { return G.formatDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000)); }
  function fmt(v, unit) { return v == null ? t('track.na') : v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + (unit || ''); }
  function stagePill(cls) {
    const s = G.STAGES[cls];
    return '<span class="stage-pill s' + cls + '">' + cls + ' · ' + esc(t('stage.' + s.key)) + '</span>';
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type: type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  // Translated error text for errors thrown by core.js (they carry a `code`).
  function errText(e) {
    if (e && e.code) return t('err.' + e.code, { v: e.value == null ? '' : e.value });
    return t('err.generic');
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ── i18n ──
  function applyI18n() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-Hans' : state.lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.title = t('app.title');
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.dataset.i18nPh)); });
    $('lang').value = state.lang;
    // stage select
    const sel = $('p-stage');
    const cur = sel.value;
    sel.innerHTML = G.STAGES.map(function (s) {
      return '<option value="' + s.id + '">' + s.id + ' · ' + esc(t('stage.' + s.key)) + '</option>';
    }).join('');
    sel.value = cur || '1';
  }

  // ── Tabs ──
  function showTab(name) {
    if (!$('tab-' + name)) name = 'assess';
    state.tab = name;
    document.querySelectorAll('nav [data-tab]').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.tab === name));
    });
    document.querySelectorAll('main > section').forEach(function (s) { s.hidden = s.id !== 'tab-' + name; });
    save();
  }

  // ── Assess ──
  let lastClass = 0;
  function renderAssess() {
    try {
      lastClass = G.classifyPalm({
        dead: $('a-dead').checked,
        fruitingBody: $('a-fruit').checked,
        lesionPct: Math.min(100, Math.max(0, Number($('a-lesion').value) || 0)),
        foliar: $('a-foliar').value
      });
      $('a-result').innerHTML = esc(t('assess.result')) + ': ' + stagePill(lastClass);
    } catch (e) {
      $('a-result').innerHTML = '<div class="bad">' + esc(errText(e)) + '</div>';
    }
  }

  // ── Plan ──
  function syncPlanForm() {
    const setting = $('p-setting').value;
    $('p-stage-wrap').hidden = setting !== 'mature';
    $('p-horizon').value = setting === 'replant' ? 104 : 52;
  }

  function makePlan() {
    const setting = $('p-setting').value;
    try {
      state.plan = G.buildPlan({
        setting: setting,
        stage: setting === 'mature' ? Number($('p-stage').value) : undefined,
        startDate: $('p-start').value,
        horizonWeeks: Number($('p-horizon').value)
      });
      const chem = $('p-chem').value.split(/[,\s]+/).filter(Boolean);
      chem.forEach(G.parseDate); // throws on bad dates
      state.chem = chem;
      renderPlan();
    } catch (e) {
      state.plan = null;
      $('p-out').innerHTML = '<div class="bad">' + esc(errText(e)) + '</div>';
    }
  }

  function renderPlan() {
    const p = state.plan;
    if (!p) { $('p-out').innerHTML = ''; return; }
    const conflicts = G.findChemicalConflicts(p, state.chem || []);
    let html = '<div class="card"><h3>' + esc(t('setting.' + p.setting)) +
      (p.stage != null ? ' — ' + stagePill(p.stage) : '') + '</h3>';
    p.warnings.forEach(function (w) { html += '<div class="warn">' + esc(t(w)) + '</div>'; });
    conflicts.forEach(function (c) {
      html += '<div class="bad">' + esc(t('plan.conflict')) + ' ' + esc(c.batchDate) + ' ↔ ' + esc(c.chemDate) +
        ' (' + c.daysApart + ' ' + esc(t('plan.days')) + ')</div>';
    });
    p.batches.forEach(function (b) {
      const title = b.number != null ? t('plan.batch', { n: b.number }) : t('kind.census');
      html += '<div class="batch ' + b.kind + '"><div class="head"><span>' + esc(title) + '</span><span>' +
        esc(b.date) + '</span><span class="kind">' + esc(t('plan.week', { n: b.week })) + ' · ' + esc(t('kind.' + b.kind)) +
        '</span></div><ul>' + b.steps.map(function (s) { return '<li>' + esc(t('step.' + s)) + '</li>'; }).join('') + '</ul></div>';
    });
    html += '</div>';
    $('p-out').innerHTML = html;
  }

  // ── Brew ──
  function renderBrew() {
    const out = $('b-out');
    if (!state.plan) { out.innerHTML = '<div class="card muted">' + esc(t('brew.needPlan')) + '</div>'; return; }
    try {
      const rows = G.planBrews(state.plan, Math.round(Number($('b-palms').value)), {
        batchKg: Number($('b-kg').value),
        failureRate: Number($('b-fail').value) / 100
      });
      if (!rows.length) { out.innerHTML = '<div class="card muted">' + esc(t('brew.none')) + '</div>'; return; }
      const cols = ['brew.col.start', 'brew.col.apply', 'brew.col.need', 'brew.col.brews', 'brew.col.rice', 'brew.col.starter', 'brew.col.useby'];
      let html = '<div class="card"><div class="table-wrap"><table><thead><tr>' +
        cols.map(function (c, i) { return '<th' + (i >= 2 && i <= 5 ? ' class="num"' : '') + '>' + esc(t(c)) + '</th>'; }).join('') +
        '</tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr><td>' + r.brewStart + '</td><td>' + r.applyDate + '</td><td class="num">' + fmt(r.kgNeeded) +
          '</td><td class="num">' + r.brews + '</td><td class="num">' + fmt(r.riceKg) + '</td><td class="num">' +
          fmt(r.starterG) + '</td><td>' + r.useBy + '</td></tr>';
      });
      out.innerHTML = html + '</tbody></table></div></div>';
    } catch (e) {
      out.innerHTML = '<div class="bad">' + esc(errText(e)) + '</div>';
    }
  }

  // ── Track ──
  function addBlock() {
    const name = $('t-name').value.trim();
    if (!name) { $('t-name').focus(); return; }
    state.blocks.push({ id: uid(), name: name, role: $('t-role').value, censuses: [] });
    $('t-name').value = '';
    save();
    renderTrack();
  }

  function chart(rows) {
    if (rows.length < 2) return '';
    const W = 320, H = 120, P = 24;
    const ts = rows.map(function (r) { return G.parseDate(r.date); });
    const t0 = ts[0], t1 = ts[ts.length - 1] || t0 + 1;
    const x = function (tt) { return P + (tt - t0) / ((t1 - t0) || 1) * (W - 2 * P); };
    const y = function (v) { return H - P - (v / 100) * (H - 2 * P); };
    function line(key, color) {
      return '<polyline fill="none" stroke="' + color + '" stroke-width="2" points="' +
        rows.map(function (r, i) { return x(ts[i]).toFixed(1) + ',' + y(r[key] || 0).toFixed(1); }).join(' ') + '"/>' +
        rows.map(function (r, i) { return '<circle cx="' + x(ts[i]).toFixed(1) + '" cy="' + y(r[key] || 0).toFixed(1) + '" r="3" fill="' + color + '"/>'; }).join('');
    }
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('track.incidence')) + ' / ' + esc(t('track.dsi')) + '">' +
      '<line x1="' + P + '" y1="' + y(0) + '" x2="' + (W - P) + '" y2="' + y(0) + '" stroke="var(--border)"/>' +
      '<line x1="' + P + '" y1="' + y(100) + '" x2="' + (W - P) + '" y2="' + y(100) + '" stroke="var(--border)" stroke-dasharray="3 3"/>' +
      '<text x="2" y="' + (y(100) + 4) + '" font-size="9" fill="var(--muted)">100</text>' +
      '<text x="8" y="' + (y(0) + 4) + '" font-size="9" fill="var(--muted)">0</text>' +
      line('incidence', 'var(--s3)') + line('dsi', 'var(--accent)') +
      '<text x="' + P + '" y="' + (H - 6) + '" font-size="9" fill="var(--s3)">● ' + esc(t('track.incidence')) + '</text>' +
      '<text x="' + (W / 2 + 10) + '" y="' + (H - 6) + '" font-size="9" fill="var(--accent)">● ' + esc(t('track.dsi')) + '</text></svg>';
  }

  function renderTrack() {
    const wrap = $('t-blocks');
    if (!state.blocks.length) { wrap.innerHTML = '<div class="card muted">' + esc(t('track.empty')) + '</div>'; renderCompare(); return; }
    wrap.innerHTML = state.blocks.map(function (b) {
      const s = G.summariseBlock(b);
      let html = '<div class="card" data-block="' + esc(b.id) + '"><h3>' + esc(b.name) + ' <span class="muted">· ' + esc(t('role.' + (b.role || 'monitor'))) + '</span></h3>';
      if (s.rows.length) {
        html += '<div class="table-wrap"><table><thead><tr><th>' + esc(t('track.date')) + '</th>' +
          G.STAGES.map(function (st) { return '<th class="num">' + st.id + '</th>'; }).join('') +
          '<th class="num">' + esc(t('track.n')) + '</th><th class="num">' + esc(t('track.incidence')) + '</th><th class="num">' + esc(t('track.dsi')) + '</th><th></th></tr></thead><tbody>';
        s.rows.forEach(function (r) {
          const c = b.censuses.find(function (x) { return x.date === r.date; });
          html += '<tr><td>' + esc(r.date) + '</td>' + c.counts.map(function (n) { return '<td class="num">' + n + '</td>'; }).join('') +
            '<td class="num">' + r.n + '</td><td class="num">' + fmt(r.incidence) + '</td><td class="num">' + fmt(r.dsi) +
            '</td><td><button class="btn danger" style="margin:0;padding:2px 8px" data-del-census="' + esc(r.date) + '" aria-label="' + esc(t('track.deleteCensus')) + '">✕</button></td></tr>';
        });
        html += '</tbody></table></div>' + chart(s.rows) +
          '<p class="muted">' + esc(t('track.audpc')) + ': ' + fmt(s.audpcDsi) + '</p>';
      }
      html += '<div class="grid2"><div><label>' + esc(t('track.date')) + '</label><input type="date" data-f="date" value="' + today() + '"></div></div>' +
        '<div class="counts">' + G.STAGES.map(function (st) {
          return '<div><label>' + st.id + ' ' + esc(t('stage.' + st.key)) + '</label><input type="number" min="0" step="1" value="0" inputmode="numeric" data-f="c' + st.id + '"></div>';
        }).join('') + '</div><div class="err"></div>' +
        '<button class="btn" data-add-census>' + esc(t('track.addCensus')) + '</button>' +
        '<button class="btn danger" data-del-block>' + esc(t('track.delete')) + '</button></div>';
      return html;
    }).join('');
    renderCompare();
  }

  function onBlockClick(ev) {
    const card = ev.target.closest('[data-block]');
    if (!card) return;
    const b = state.blocks.find(function (x) { return x.id === card.dataset.block; });
    if (!b) return;
    if (ev.target.closest('[data-add-census]')) {
      const date = card.querySelector('[data-f=date]').value;
      const counts = G.STAGES.map(function (st) { return Number(card.querySelector('[data-f=c' + st.id + ']').value); });
      try {
        G.parseDate(date);
        G.summariseCensus(counts);
      } catch (e) {
        card.querySelector('.err').innerHTML = '<div class="bad">' + esc(t('track.badCounts')) + '</div>';
        return;
      }
      b.censuses = b.censuses.filter(function (c) { return c.date !== date; }); // one census per date
      b.censuses.push({ date: date, counts: counts });
      save(); renderTrack();
    } else if (ev.target.closest('[data-del-census]')) {
      const d = ev.target.closest('[data-del-census]').dataset.delCensus;
      b.censuses = b.censuses.filter(function (c) { return c.date !== d; });
      save(); renderTrack();
    } else if (ev.target.closest('[data-del-block]')) {
      if (!confirm(t('track.confirmDelete'))) return;
      state.blocks = state.blocks.filter(function (x) { return x !== b; });
      save(); renderTrack();
    }
  }

  function renderCompare() {
    const out = $('t-compare');
    const treated = state.blocks.filter(function (b) { return b.role === 'treated' && b.censuses.length; });
    const control = state.blocks.filter(function (b) { return b.role === 'control' && b.censuses.length; });
    if (!treated.length || !control.length) { out.innerHTML = ''; return; }
    const prev = { tr: ($('cmp-t') || {}).value, co: ($('cmp-c') || {}).value };
    function opts(list, id) {
      return '<select class="field" id="' + id + '">' + list.map(function (b) {
        return '<option value="' + esc(b.id) + '">' + esc(b.name) + '</option>';
      }).join('') + '</select>';
    }
    out.innerHTML = '<div class="card"><h3>' + esc(t('track.compare')) + '</h3><div class="grid2"><div><label for="cmp-t">' +
      esc(t('role.treated')) + '</label>' + opts(treated, 'cmp-t') + '</div><div><label for="cmp-c">' + esc(t('role.control')) +
      '</label>' + opts(control, 'cmp-c') + '</div></div><div id="cmp-out"></div></div>';
    if (prev.tr && treated.some(function (b) { return b.id === prev.tr; })) $('cmp-t').value = prev.tr;
    if (prev.co && control.some(function (b) { return b.id === prev.co; })) $('cmp-c').value = prev.co;
    function update() {
      const tb = state.blocks.find(function (b) { return b.id === $('cmp-t').value; });
      const cb = state.blocks.find(function (b) { return b.id === $('cmp-c').value; });
      const r = G.compareTrial(cb, tb).reduction;
      const items = [['track.latestInc', r.incidence], ['track.latestDsi', r.dsi], ['track.audpcInc', r.audpcIncidence], ['track.audpcDsi', r.audpcDsi]];
      $('cmp-out').innerHTML = '<p class="muted">' + esc(t('track.reduction')) + '</p><div class="kpi">' +
        items.map(function (it) { return '<div>' + esc(t(it[0])) + '<b>' + fmt(it[1], it[1] == null ? '' : '%') + '</b></div>'; }).join('') + '</div>';
    }
    $('cmp-t').onchange = update; $('cmp-c').onchange = update;
    update();
  }

  function restore(file) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const d = JSON.parse(reader.result);
        const blocks = (d.blocks || []).filter(validBlock).map(function (b) {
          return { id: b.id || uid(), name: b.name, role: ['treated', 'control', 'monitor'].includes(b.role) ? b.role : 'monitor', censuses: b.censuses };
        });
        if (!blocks.length) throw new Error('empty');
        state.blocks = blocks;
        save(); renderTrack();
      } catch (e) { alert(t('track.restoreBad')); }
    };
    reader.readAsText(file);
  }

  // ── Evidence ──
  // Pick the current language from a { en, ms, zh } object (or pass a string through).
  function loc(v) { return v && typeof v === 'object' ? (v[state.lang] || v.en || '') : (v || ''); }

  function renderBuy(evidenceId) {
    const items = G.productsFor(evidenceId);
    let html = '<div class="buy"><h4>' + esc(t('buy.h')) + '</h4>';
    if (!items.length) return html + '<p class="muted">' + esc(t('buy.none')) + '</p></div>';
    html += items.map(function (p) {
      return '<div class="product"><b>' + esc(p.name) + '</b>' +
        (p.strainMatch ? ' <span class="level lv3">' + esc(t('buy.strainMatch')) + '</span>' : '') +
        '<div class="muted">' + esc(p.company) + (p.mpob ? ' · ' + esc(t('buy.withMpob')) : '') + '</div>' +
        '<div>' + esc(loc(p.price)) + '</div>' +
        (p.contact ? '<div>' + esc(t('buy.contact')) + ': ' + esc(p.contact) + '</div>' : '') +
        '<div class="muted">' + esc(loc(p.note)) + '</div>' +
        '<div>' + p.links.map(function (l) { return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + '</a>'; }).join(' · ') + '</div></div>';
    }).join('');
    return html + '</div>';
  }

  function renderEvidence() {
    const list = G.EVIDENCE.slice().sort(function (a, b) { return b.level - a.level; });
    $('e-out').innerHTML = list.map(function (e) {
      return '<div class="card ev"><h3>' + esc(loc(e.agent)) + '</h3><span class="level lv' + e.level + '">' + esc(t('ev.level.' + e.level)) + '</span>' +
        '<p><b>' + esc(t('ev.setting')) + ':</b> ' + esc(loc(e.setting)) + '</p><p><b>' + esc(t('ev.result')) + ':</b> ' + esc(loc(e.result)) + '</p>' +
        (loc(e.note) ? '<p class="muted">' + esc(loc(e.note)) + '</p>' : '') +
        '<p>' + e.sources.map(function (s) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(loc(s.label)) + '</a>'; }).join(' · ') + '</p>' +
        renderBuy(e.id) + '</div>';
    }).join('') +
      '<div class="card ev"><h3>' + esc(t('ev.reviews')) + '</h3><ul>' + G.REVIEWS.map(function (r) {
        return '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(loc(r.label)) + '</a></li>';
      }).join('') + '</ul><p class="muted">' + esc(t('ev.checked')) + '</p><p class="muted">' + esc(t('buy.disclaimer')) + '</p></div>';
  }

  function renderAll() {
    applyI18n();
    renderAssess();
    renderPlan();
    renderBrew();
    renderTrack();
    renderEvidence();
  }

  // ── Wire up ──
  function init() {
    load();
    I.setLang(state.lang);
    $('p-start').value = today();
    syncPlanForm();
    renderAll();
    showTab(state.tab);

    $('lang').addEventListener('change', function () { state.lang = this.value; I.setLang(state.lang); save(); renderAll(); });
    document.querySelectorAll('nav [data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { showTab(b.dataset.tab); if (b.dataset.tab === 'brew') renderBrew(); });
    });
    ['a-dead', 'a-fruit', 'a-lesion', 'a-foliar'].forEach(function (id) { $(id).addEventListener('input', renderAssess); });
    $('a-toplan').addEventListener('click', function () {
      $('p-setting').value = 'mature'; syncPlanForm();
      $('p-stage').value = String(lastClass);
      makePlan(); showTab('plan');
    });
    $('p-setting').addEventListener('change', syncPlanForm);
    $('p-make').addEventListener('click', makePlan);
    $('p-print').addEventListener('click', function () { window.print(); });
    $('b-make').addEventListener('click', renderBrew);
    $('t-add').addEventListener('click', addBlock);
    $('t-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') addBlock(); });
    $('t-blocks').addEventListener('click', onBlockClick);
    $('t-csv').addEventListener('click', function () { download('ganoderma-blocks.csv', G.blocksToCsv(state.blocks), 'text/csv'); });
    $('t-backup').addEventListener('click', function () {
      download('ganoderma-backup.json', JSON.stringify({ app: 'ganoderma-bsr', version: 1, blocks: state.blocks }, null, 2), 'application/json');
    });
    $('t-restore-btn').addEventListener('click', function () { $('t-restore').click(); });
    $('t-restore').addEventListener('change', function () { if (this.files[0]) restore(this.files[0]); this.value = ''; });

    registerSW();
  }

  // ── Service worker (offline + update prompt). Degrades silently. ──
  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.addEventListener('message', function (ev) {
      if (ev.data && ev.data.type === 'UPDATE_AVAILABLE') $('toast').classList.add('show');
    });
    $('toast-reload').addEventListener('click', function () { location.reload(); });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./service-worker.js').catch(function () { /* ignore */ });
    });
  }

  init();
})();
