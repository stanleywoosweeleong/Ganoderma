# Ganoderma BSR Manager

An offline web app (PWA) for managing **basal stem rot (BSR)**, also known as
Ganoderma disease (灵芝病 / 茎基腐病), caused by ***Ganoderma boninense*** in oil
palm and coconut. Available in English, Bahasa Melayu and 中文.

It turns the microbes that may help into a **multi-batch treatment
programme** backed by the published research.

> **Limits.** Biocontrol prevents BSR and slows it down. No study we found
> cured an established infection in a mature palm with microbes, so the app
> plans **sanitation, not treatment** for severe and dead palms. Amounts are
> indicative: follow product labels and MPOB advice.

## Features

| Tab | What it does |
|---|---|
| **Assess** | Scores a palm on a 0–4 scale (Healthy / Early / Moderate / Severe / Dead) from four observations: brackets, rotten share of the trunk-base circumference, leaf symptoms, dead. |
| **Plan** | Builds a dated **multi-batch plan** for planted palms (one per stage), replanting, or nursery. It covers sanitation, soil mounding, Trichoderma, bacterial drench, AMF, EFB compost, maintenance batches and census dates. It warns when a Trichoderma batch falls within 28 days of a hexaconazole trunk injection. |
| **Brew** | Turns the plan into a **Trichoderma rice-grain brewing schedule**, using the AMIS recipe: when to start each brew, kg of rice, grams of starter, and the use-by date. It adds extra brews for the ~30% DIY failure rate. |
| **Track** | Records a census per block and computes **disease incidence, disease severity index (DSI) and area under the disease progress curve (AUDPC)**, the same measures used in published trials. It compares a **treated** block with a **control** block (% disease reduction), and exports CSV or a JSON backup. |
| **Evidence** | The literature summary (Nov 2026). Each agent shows its evidence level (field / nursery / lab), key results, links to the sources, and **where to buy** matching products in Malaysia (company, contact, listing price, Nov 2026). |

### What the plans contain (planted palms)

| Stage | Batch 1 (wk 0) | Batch 2 | Batch 3 | Afterwards |
|---|---|---|---|---|
| 0 Healthy (neighbours, prevention) | Trichoderma ring + EFB mulch | wk 6 bacterial drench | wk 12 Trichoderma | Trichoderma every 16 wk, census every 26 wk |
| 1 Early | Remove brackets, scrape out rot, mound soil, Trichoderma | wk 4 drench | wk 8 Trichoderma | wk 12 mound again; Trichoderma + drench every 12 wk |
| 2 Moderate | Same as Early | wk 4 drench | wk 8 Trichoderma | Every 8 wk; census every 6 wk; warns about hexaconazole clashes |
| 3–4 Severe / dead | Fell, dig out bole, chip | wk 2 Trichoderma at the old palm's position | — | Run the Healthy plan on 1–2 rings of neighbours |

The **replant** plan (104 weeks) treats each planting hole with Trichoderma,
AMF and EFB compost. The **nursery** plan repeats Trichoderma every
12 weeks.

## Run it

No build step. Serve the folder over HTTP:

```bash
npm start
```

Then open http://localhost:8080. To install it as an app with offline use,
deploy all files to any HTTPS host (GitHub Pages, Cloudflare Pages,
Netlify). When you ship changes, bump `CACHE_VERSION` in
`service-worker.js`.

## Tests

All logic is in `js/core.js` as pure functions. The tests use Node's
built-in test runner and need no dependencies:

```bash
npm test
```

They cover:
- staging rules
- incidence, DSI and AUDPC formulas
- treated vs control reduction (one test reproduces the published GanoCare
  field figures)
- plan dates across month and year boundaries
- chemical-clash detection
- brewing quantities
- CSV quoting
- the evidence library
- translations: every string a plan can produce exists in all three
  languages

CI runs the tests on every push (`.github/workflows/test.yml`).

## Files

```
index.html          UI (tabs, styles)
js/core.js          logic + evidence data (tested, no DOM)
js/i18n.js          English / Malay / Chinese strings
js/app.js           browser wiring, storage, rendering
tests/*.test.js     node:test suites
service-worker.js   offline cache + update prompt
manifest.json       PWA metadata
```

Data is stored only in the browser on that device (`localStorage`). Use
**Backup (JSON)** to keep a copy.

## Key sources

- Sundram et al. 2015: *P. aeruginosa* UPMP3 + AMF, 80% BSR reduction in a field (bait-seedling) trial
- JOPR 2018: Trichoderma mixture, 83–89% symptom reduction in seedlings
- Rebitanim et al. 2020: GanoCare® field trial, incidence 26.7% vs 100%
- Plant Disease 2022 and J Fungi 2024: reviews

See the Evidence tab for the full list with links. Check the original
papers before relying on any figure.
