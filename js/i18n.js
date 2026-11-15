/* Ganoderma BSR Manager — translations (en / ms / zh). */
(function (root) {
  'use strict';
  const T = {
    'app.title': { en: 'Ganoderma BSR Manager', ms: 'Pengurus Reput Pangkal Batang Ganoderma', zh: '灵芝茎基腐病管理' },
    'app.tagline': {
      en: 'Basal stem rot (Ganoderma boninense) — assess palms, plan multi-batch biocontrol, brew Trichoderma, track trials.',
      ms: 'Reput pangkal batang (Ganoderma boninense) — nilai pokok, rancang kawalan biologi berperingkat, hasilkan Trichoderma, jejak percubaan.',
      zh: '茎基腐病(博宁灵芝 Ganoderma boninense)— 评估棕树、规划多批次生防、自制木霉、追踪试验。'
    },
    'disclaimer': {
      en: 'Biocontrol prevents and slows BSR — it does not cure an established infection. Amounts are indicative; follow product labels and MPOB advice.',
      ms: 'Kawalan biologi mencegah dan melambatkan BSR — ia tidak menyembuhkan jangkitan yang sudah teruk. Kadar adalah anggaran; ikut label produk dan nasihat MPOB.',
      zh: '生物防治只能预防和延缓茎基腐病,不能治愈已严重感染的棕树。用量仅供参考,请遵循产品标签及 MPOB 建议。'
    },

    'tab.assess': { en: 'Assess', ms: 'Nilai', zh: '评估' },
    'tab.plan': { en: 'Plan', ms: 'Pelan', zh: '方案' },
    'tab.brew': { en: 'Brew', ms: 'Hasilkan', zh: '自制' },
    'tab.track': { en: 'Track', ms: 'Jejak', zh: '追踪' },
    'tab.evidence': { en: 'Evidence', ms: 'Bukti', zh: '文献' },

    // Stages
    'stage.healthy': { en: 'Healthy', ms: 'Sihat', zh: '健康' },
    'stage.early': { en: 'Early', ms: 'Awal', zh: '早期' },
    'stage.moderate': { en: 'Moderate', ms: 'Sederhana', zh: '中期' },
    'stage.severe': { en: 'Severe', ms: 'Teruk', zh: '严重' },
    'stage.dead': { en: 'Dead', ms: 'Mati', zh: '死亡' },

    // Assess
    'assess.h': { en: 'Assess one palm', ms: 'Nilai sebatang pokok', zh: '评估单棵棕树' },
    'assess.dead': { en: 'Palm is dead or trunk has snapped', ms: 'Pokok mati atau batang patah', zh: '棕树已死亡或树干折断' },
    'assess.fruiting': { en: 'Ganoderma bracket (fruiting body) on trunk base or roots', ms: 'Jasad buah Ganoderma pada pangkal batang atau akar', zh: '树干基部或根部有灵芝子实体' },
    'assess.lesion': { en: 'Rotten part of trunk-base circumference (%)', ms: 'Bahagian lilitan pangkal batang yang reput (%)', zh: '树干基部周长腐烂比例 (%)' },
    'assess.foliar': { en: 'Leaf symptoms', ms: 'Simptom daun', zh: '叶部症状' },
    'foliar.none': { en: 'None', ms: 'Tiada', zh: '无' },
    'foliar.mild': { en: 'Yellowing or 2+ unopened spear leaves', ms: 'Menguning atau 2+ pucuk tidak terbuka', zh: '叶片发黄或 2 片以上箭叶未展开' },
    'foliar.severe': { en: 'Many unopened spears, fronds collapsing into a skirt', ms: 'Banyak pucuk tidak terbuka, pelepah jatuh seperti skirt', zh: '多片箭叶未展开,叶片下垂成裙状' },
    'assess.result': { en: 'Result', ms: 'Keputusan', zh: '结果' },
    'assess.toPlan': { en: 'Make treatment plan', ms: 'Buat pelan rawatan', zh: '生成处理方案' },
    'assess.scale': {
      en: 'App scale: 0 Healthy · 1 Early · 2 Moderate · 3 Severe · 4 Dead. Same classes are used for block census and DSI.',
      ms: 'Skala aplikasi: 0 Sihat · 1 Awal · 2 Sederhana · 3 Teruk · 4 Mati. Kelas yang sama digunakan untuk bancian blok dan DSI.',
      zh: '本应用等级:0 健康 · 1 早期 · 2 中期 · 3 严重 · 4 死亡。区块普查与病情指数 (DSI) 使用相同等级。'
    },

    // Plan
    'plan.h': { en: 'Multi-batch treatment plan', ms: 'Pelan rawatan berperingkat', zh: '多批次处理方案' },
    'plan.setting': { en: 'Situation', ms: 'Situasi', zh: '情况' },
    'setting.mature': { en: 'Planted palm (field)', ms: 'Pokok di ladang', zh: '田间棕树' },
    'setting.replant': { en: 'Replanting a Ganoderma block', ms: 'Tanam semula blok Ganoderma', zh: '灵芝病区块重植' },
    'setting.nursery': { en: 'Nursery seedlings', ms: 'Anak benih tapak semaian', zh: '苗圃幼苗' },
    'plan.stage': { en: 'Palm stage', ms: 'Peringkat pokok', zh: '棕树病级' },
    'plan.start': { en: 'Start date (batch 1)', ms: 'Tarikh mula (kelompok 1)', zh: '开始日期(第 1 批)' },
    'plan.horizon': { en: 'Plan length (weeks)', ms: 'Tempoh pelan (minggu)', zh: '方案时长(周)' },
    'plan.chem': { en: 'Chemical trunk-injection dates (optional, comma separated)', ms: 'Tarikh suntikan kimia batang (pilihan, dipisah koma)', zh: '化学树干注射日期(可选,用逗号分隔)' },
    'plan.make': { en: 'Build plan', ms: 'Bina pelan', zh: '生成方案' },
    'plan.print': { en: 'Print', ms: 'Cetak', zh: '打印' },
    'plan.batch': { en: 'Batch {n}', ms: 'Kelompok {n}', zh: '第 {n} 批' },
    'plan.week': { en: 'Week {n}', ms: 'Minggu {n}', zh: '第 {n} 周' },
    'kind.batch': { en: 'Treatment batch', ms: 'Kelompok rawatan', zh: '处理批次' },
    'kind.maintenance': { en: 'Maintenance', ms: 'Penyelenggaraan', zh: '维护' },
    'kind.census': { en: 'Census only', ms: 'Bancian sahaja', zh: '仅普查' },
    'plan.conflict': { en: 'Too close to a chemical injection (Trichoderma will be killed) — move this batch:', ms: 'Terlalu hampir dengan suntikan kimia (Trichoderma akan mati) — alihkan kelompok ini:', zh: '与化学注射间隔太近(木霉会被杀死)— 请调整该批次:' },
    'plan.days': { en: 'days apart', ms: 'hari jarak', zh: '天间隔' },

    // Steps
    'step.tricho.ring': {
      en: 'Trichoderma: ~0.5 kg rice-grain inoculant mixed into 5 kg compost/EFB compost, spread in a 1 m ring around the trunk base, lightly worked in.',
      ms: 'Trichoderma: ~0.5 kg inokulum beras dicampur 5 kg kompos/kompos TKS, tabur dalam bulatan 1 m sekeliling pangkal batang, gaul ringan.',
      zh: '木霉:约 0.5 kg 米粒菌种拌入 5 kg 堆肥/空果串堆肥,撒于树干基部 1 米范围,轻轻翻入土中。'
    },
    'step.tricho.hole': {
      en: 'Trichoderma: 200–500 g rice-grain inoculant mixed into the planting-hole soil.',
      ms: 'Trichoderma: 200–500 g inokulum beras dicampur ke dalam tanah lubang tanam.',
      zh: '木霉:200–500 g 米粒菌种拌入种植穴土壤。'
    },
    'step.tricho.site': {
      en: 'Trichoderma: ~0.5 kg inoculant + compost into the soil where the palm stood.',
      ms: 'Trichoderma: ~0.5 kg inokulum + kompos ke dalam tanah tapak pokok asal.',
      zh: '木霉:约 0.5 kg 菌种加堆肥施入原棕树位置的土壤。'
    },
    'step.tricho.nursery': {
      en: 'Trichoderma: ~50 g inoculant per polybag mixed into the top soil.',
      ms: 'Trichoderma: ~50 g inokulum setiap beg polibag dicampur ke tanah atas.',
      zh: '木霉:每个育苗袋约 50 g 菌种,拌入表土。'
    },
    'step.bact.drench': {
      en: 'Bacterial drench around the trunk base: Pseudomonas / Bacillus / Streptomyces product at label rate, ~5–10 L per palm. Do not mix with copper or fungicides.',
      ms: 'Siram bakteria sekeliling pangkal batang: produk Pseudomonas / Bacillus / Streptomyces pada kadar label, ~5–10 L setiap pokok. Jangan campur dengan kuprum atau racun kulat.',
      zh: '细菌灌根:假单胞菌 / 芽孢杆菌 / 链霉菌产品按标签用量,每棵约 5–10 L,灌于树干基部。不可与铜制剂或杀菌剂混用。'
    },
    'step.bact.drench.nursery': {
      en: 'Bacterial drench: Pseudomonas / Bacillus product at label rate, ~0.5 L per polybag.',
      ms: 'Siram bakteria: produk Pseudomonas / Bacillus pada kadar label, ~0.5 L setiap polibag.',
      zh: '细菌灌根:假单胞菌 / 芽孢杆菌产品按标签用量,每袋约 0.5 L。'
    },
    'step.amf.hole': { en: 'Mycorrhiza (AMF, e.g. Glomus): label rate into the planting hole, touching the roots.', ms: 'Mikoriza (AMF, cth. Glomus): kadar label ke dalam lubang tanam, bersentuhan dengan akar.', zh: '菌根真菌(AMF,如球囊霉):按标签用量放入种植穴,接触根系。' },
    'step.amf.nursery': { en: 'Mycorrhiza (AMF): ~5 g per polybag at transplanting.', ms: 'Mikoriza (AMF): ~5 g setiap polibag semasa pindah tanam.', zh: '菌根真菌(AMF):移栽时每袋约 5 g。' },
    'step.efb.mulch': { en: 'Mulch with EFB compost around the base (carrier and food for Trichoderma).', ms: 'Sungkup kompos TKS di sekeliling pangkal (pembawa dan makanan Trichoderma).', zh: '树基周围覆盖空果串堆肥(木霉的载体和养分)。' },
    'step.sanitise.brackets': { en: 'Remove all Ganoderma brackets; bag and take them out of the field (they release spores).', ms: 'Buang semua jasad buah Ganoderma; masukkan dalam beg dan bawa keluar dari ladang (ia melepaskan spora).', zh: '摘除所有灵芝子实体,装袋带离田间(子实体会释放孢子)。' },
    'step.sanitise.surgery': { en: 'Scrape out rotten tissue at the trunk base until clean tissue shows; remove debris from the field.', ms: 'Korek tisu reput di pangkal batang sehingga tisu bersih kelihatan; buang sisa keluar dari ladang.', zh: '刮除树干基部腐烂组织直至露出健康组织,残渣带离田间。' },
    'step.mound': { en: 'Soil mounding: pile soil around the trunk base (about knee-high, ~1 m wide) to support it and cover the lesion.', ms: 'Penimbusan tanah: timbun tanah sekeliling pangkal batang (kira-kira paras lutut, ~1 m lebar) untuk menyokong dan menutup luka.', zh: '培土:在树干基部周围堆土(约及膝高、1 米宽),支撑树干并覆盖病斑。' },
    'step.sanitise.fell': { en: 'Fell the palm. It cannot be saved and is the main source of new infections.', ms: 'Tebang pokok. Ia tidak boleh diselamatkan dan merupakan punca utama jangkitan baharu.', zh: '砍伐该棕树。已无法挽救,且是新感染的主要来源。' },
    'step.sanitise.bole': { en: 'Dig out the bole and as much of the root mass as practical — infected roots keep the fungus alive for years.', ms: 'Gali keluar pangkal dan seberapa banyak jisim akar yang boleh — akar dijangkiti mengekalkan kulat selama bertahun-tahun.', zh: '挖除树桩并尽量清除根团 — 受感染的根可让病菌存活多年。' },
    'step.sanitise.chip': { en: 'Chip or shred trunk and bole; spread thinly to dry or destroy. Never leave whole trunks to rot in the field.', ms: 'Cincang batang dan pangkal; sebar nipis untuk kering atau musnahkan. Jangan biarkan batang reput di ladang.', zh: '将树干和树桩切碎,薄摊晒干或销毁。切勿把整段树干留在田间腐烂。' },
    'step.census': { en: 'Census: score every palm 0–4 in this block and enter counts in the Track tab.', ms: 'Bancian: beri skor 0–4 setiap pokok dalam blok ini dan masukkan bilangan dalam tab Jejak.', zh: '普查:对本区块每棵棕树按 0–4 评级,并在「追踪」页输入数量。' },

    // Warnings
    'warn.prevention': { en: 'Prevention plan — best used on healthy palms in the 1–2 rings around any diseased palm, and at replanting.', ms: 'Pelan pencegahan — paling sesuai untuk pokok sihat dalam 1–2 lingkaran sekeliling pokok berpenyakit, dan semasa tanam semula.', zh: '预防方案 — 最适合病株周围 1–2 圈的健康棕树,以及重植时使用。' },
    'warn.early': { en: 'Early stage is the only stage where Trichoderma has been shown to protect palms. Act now.', ms: 'Peringkat awal adalah satu-satunya peringkat Trichoderma terbukti melindungi pokok. Bertindak sekarang.', zh: '早期是唯一被证实木霉能保护棕树的阶段,请立即行动。' },
    'warn.moderate': { en: 'Chance of recovery is low. The aim is to slow decline, keep the palm producing, and protect neighbours.', ms: 'Peluang pulih adalah rendah. Matlamatnya melambatkan kemerosotan, mengekalkan hasil dan melindungi pokok jiran.', zh: '康复机会低。目标是延缓衰退、维持产量并保护邻近棕树。' },
    'warn.severe': { en: 'No microbe can save this palm. Remove it properly so it stops infecting others.', ms: 'Tiada mikrob boleh menyelamatkan pokok ini. Buang dengan betul supaya ia berhenti menjangkiti pokok lain.', zh: '没有任何微生物能挽救这棵棕树。请正确清除,以免继续传染其他棕树。' },
    'warn.neighbours': { en: 'Also run the Healthy (prevention) plan on the 1–2 rings of palms around this one.', ms: 'Jalankan juga pelan Sihat (pencegahan) pada 1–2 lingkaran pokok di sekelilingnya.', zh: '同时对周围 1–2 圈棕树执行「健康(预防)」方案。' },
    'warn.chemical': { en: 'If you also use hexaconazole trunk injection: it kills Trichoderma. Keep ≥4 weeks between injection and Trichoderma (app default) — enter injection dates to check.', ms: 'Jika anda juga menggunakan suntikan heksakonazol: ia membunuh Trichoderma. Jarakkan ≥4 minggu antara suntikan dan Trichoderma (lalai aplikasi) — masukkan tarikh suntikan untuk semak.', zh: '若同时使用己唑醇树干注射:它会杀死木霉。注射与施用木霉至少间隔 4 周(应用默认)— 输入注射日期可自动检查。' },
    'warn.replant': { en: 'Remove all old trunks and root masses before planting. Treat every planting hole.', ms: 'Buang semua batang dan akar lama sebelum menanam. Rawat setiap lubang tanam.', zh: '种植前清除所有旧树干和根团,每个种植穴都要处理。' },
    'warn.nursery': { en: 'Nursery pre-treatment gave the strongest results in trials (Trichoderma/AMF/Pseudomonas). Keep treating after field planting.', ms: 'Pra-rawatan di tapak semaian memberi keputusan terbaik dalam percubaan (Trichoderma/AMF/Pseudomonas). Teruskan rawatan selepas tanam di ladang.', zh: '苗圃预处理在试验中效果最好(木霉/菌根/假单胞菌)。定植田间后继续处理。' },

    // Brew
    'brew.h': { en: 'Trichoderma brewing schedule', ms: 'Jadual penghasilan Trichoderma', zh: '木霉自制排程' },
    'brew.intro': {
      en: 'Rice-grain recipe (from AMIS): cook plain rice, cool, mix 1 g starter per 500 g rice, incubate in shade 5–7 days until green, shade-dry. Use within 2 months. About 30% of DIY batches fail — extra brews are included.',
      ms: 'Resipi beras (daripada AMIS): masak nasi kosong, sejukkan, campur 1 g pemula setiap 500 g nasi, eram di tempat teduh 5–7 hari sehingga hijau, kering di tempat teduh. Guna dalam 2 bulan. Kira-kira 30% kelompok DIY gagal — kelompok tambahan sudah dikira.',
      zh: '米粒配方(来自 AMIS):白米煮熟放凉,每 500 g 米拌 1 g 菌种,阴凉处培养 5–7 天至转绿,阴干。2 个月内用完。约 30% 自制批次会失败 — 已计入额外批次。'
    },
    'brew.palms': { en: 'Number of palms / polybags', ms: 'Bilangan pokok / polibag', zh: '棕树 / 育苗袋数量' },
    'brew.batchKg': { en: 'Cooked rice per brew (kg)', ms: 'Nasi setiap kelompok (kg)', zh: '每批熟米 (kg)' },
    'brew.failure': { en: 'Expected failure rate (%)', ms: 'Kadar kegagalan dijangka (%)', zh: '预计失败率 (%)' },
    'brew.make': { en: 'Calculate', ms: 'Kira', zh: '计算' },
    'brew.needPlan': { en: 'Build a plan in the Plan tab first.', ms: 'Bina pelan dalam tab Pelan dahulu.', zh: '请先在「方案」页生成方案。' },
    'brew.none': { en: 'This plan has no Trichoderma batches.', ms: 'Pelan ini tiada kelompok Trichoderma.', zh: '此方案没有木霉批次。' },
    'brew.col.start': { en: 'Start brewing', ms: 'Mula hasilkan', zh: '开始制作' },
    'brew.col.apply': { en: 'Apply on', ms: 'Guna pada', zh: '施用日期' },
    'brew.col.need': { en: 'Inoculant needed (kg)', ms: 'Inokulum perlu (kg)', zh: '所需菌种 (kg)' },
    'brew.col.brews': { en: 'Brews', ms: 'Kelompok', zh: '批数' },
    'brew.col.rice': { en: 'Rice (kg)', ms: 'Beras (kg)', zh: '米 (kg)' },
    'brew.col.starter': { en: 'Starter (g)', ms: 'Pemula (g)', zh: '菌种母 (g)' },
    'brew.col.useby': { en: 'Use by', ms: 'Guna sebelum', zh: '最迟使用' },

    // Track
    'track.h': { en: 'Blocks & trials', ms: 'Blok & percubaan', zh: '区块与试验' },
    'track.intro': {
      en: 'Record a census per block (palm counts per class). The app computes disease incidence, DSI and AUDPC — the same measures used in published trials — and compares treated vs control blocks.',
      ms: 'Rekod bancian setiap blok (bilangan pokok setiap kelas). Aplikasi mengira insiden penyakit, DSI dan AUDPC — ukuran yang sama dalam kajian diterbitkan — dan membandingkan blok dirawat vs kawalan.',
      zh: '为每个区块记录普查(各等级棕树数量)。应用会计算发病率、病情指数 (DSI) 和病程曲线下面积 (AUDPC) — 与已发表试验相同的指标 — 并比较处理区与对照区。'
    },
    'track.new': { en: 'New block name', ms: 'Nama blok baharu', zh: '新区块名称' },
    'track.role': { en: 'Role', ms: 'Peranan', zh: '角色' },
    'role.monitor': { en: 'Monitor', ms: 'Pantau', zh: '监测' },
    'role.treated': { en: 'Treated', ms: 'Dirawat', zh: '处理区' },
    'role.control': { en: 'Control (untreated)', ms: 'Kawalan (tidak dirawat)', zh: '对照区(不处理)' },
    'track.add': { en: 'Add block', ms: 'Tambah blok', zh: '添加区块' },
    'track.addCensus': { en: 'Add census', ms: 'Tambah bancian', zh: '添加普查' },
    'track.date': { en: 'Date', ms: 'Tarikh', zh: '日期' },
    'track.n': { en: 'Palms', ms: 'Pokok', zh: '株数' },
    'track.incidence': { en: 'Incidence %', ms: 'Insiden %', zh: '发病率 %' },
    'track.dsi': { en: 'DSI %', ms: 'DSI %', zh: '病情指数 %' },
    'track.audpc': { en: 'AUDPC (DSI, %·days)', ms: 'AUDPC (DSI, %·hari)', zh: 'AUDPC(DSI,%·天)' },
    'track.delete': { en: 'Delete block', ms: 'Padam blok', zh: '删除区块' },
    'track.confirmDelete': { en: 'Delete this block and all its censuses?', ms: 'Padam blok ini dan semua bancian?', zh: '删除此区块及其所有普查记录?' },
    'track.compare': { en: 'Compare treated vs control', ms: 'Banding dirawat vs kawalan', zh: '比较处理区与对照区' },
    'track.reduction': { en: 'Disease reduction vs control', ms: 'Pengurangan penyakit berbanding kawalan', zh: '相对对照的病害减少' },
    'track.latestInc': { en: 'Latest incidence', ms: 'Insiden terkini', zh: '最新发病率' },
    'track.latestDsi': { en: 'Latest DSI', ms: 'DSI terkini', zh: '最新病情指数' },
    'track.audpcInc': { en: 'AUDPC (incidence)', ms: 'AUDPC (insiden)', zh: 'AUDPC(发病率)' },
    'track.audpcDsi': { en: 'AUDPC (DSI)', ms: 'AUDPC (DSI)', zh: 'AUDPC(病情指数)' },
    'track.na': { en: 'n/a', ms: 't/b', zh: '无' },
    'track.empty': { en: 'No blocks yet.', ms: 'Belum ada blok.', zh: '尚无区块。' },
    'track.export': { en: 'Export CSV', ms: 'Eksport CSV', zh: '导出 CSV' },
    'track.backup': { en: 'Backup (JSON)', ms: 'Sandaran (JSON)', zh: '备份 (JSON)' },
    'track.restore': { en: 'Restore', ms: 'Pulihkan', zh: '恢复' },
    'track.restoreBad': { en: 'That file is not a valid backup.', ms: 'Fail itu bukan sandaran yang sah.', zh: '该文件不是有效的备份。' },
    'track.storageNote': { en: 'Data is saved only on this device. Use Backup to keep a copy.', ms: 'Data disimpan pada peranti ini sahaja. Guna Sandaran untuk simpan salinan.', zh: '数据只保存在本设备。请用「备份」保存副本。' },
    'track.badCounts': { en: 'Enter whole numbers (0 or more) for every class.', ms: 'Masukkan nombor bulat (0 atau lebih) untuk setiap kelas.', zh: '每个等级请输入 0 或以上的整数。' },

    // Evidence
    'ev.h': { en: 'Research evidence', ms: 'Bukti kajian', zh: '研究证据' },
    'ev.intro': {
      en: 'What published studies show for each agent against Ganoderma boninense. Most results are from seedlings; no study cured mature infected palms with microbes.',
      ms: 'Apa yang ditunjukkan oleh kajian untuk setiap agen terhadap Ganoderma boninense. Kebanyakan keputusan daripada anak benih; tiada kajian menyembuhkan pokok matang yang dijangkiti dengan mikrob.',
      zh: '各制剂防治博宁灵芝的已发表研究结果。大多数结果来自幼苗;尚无研究用微生物治愈已感染的成龄棕树。'
    },
    'ev.level.3': { en: 'Field trial', ms: 'Percubaan ladang', zh: '田间试验' },
    'ev.level.2': { en: 'Nursery / glasshouse', ms: 'Semaian / rumah kaca', zh: '苗圃 / 温室' },
    'ev.level.1': { en: 'Lab or related host only', ms: 'Makmal atau perumah lain sahaja', zh: '仅实验室或近缘寄主' },
    'ev.level.0': { en: 'No evidence found', ms: 'Tiada bukti', zh: '未找到证据' },
    'ev.setting': { en: 'Setting', ms: 'Keadaan', zh: '条件' },
    'ev.result': { en: 'Result', ms: 'Keputusan', zh: '结果' },
    'ev.reviews': { en: 'Reviews', ms: 'Ulasan', zh: '综述' },
    'ev.checked': { en: 'Literature search: November 2026. Check original papers before relying on figures.', ms: 'Carian literatur: November 2026. Semak kertas asal sebelum bergantung pada angka.', zh: '文献检索:2026 年 11 月。引用数据前请核对原文。' },

    'update.ready': { en: 'A new version is ready.', ms: 'Versi baharu sedia.', zh: '新版本已就绪。' },
    'update.reload': { en: 'Reload', ms: 'Muat semula', zh: '重新加载' }
  };

  let lang = 'en';
  function t(key, params) {
    const e = T[key];
    let s = e ? (e[lang] || e.en) : key;
    if (params) Object.keys(params).forEach(function (k) { s = s.split('{' + k + '}').join(String(params[k])); });
    return s;
  }
  function setLang(l) { if (['en', 'ms', 'zh'].includes(l)) lang = l; }
  function getLang() { return lang; }

  const api = { t: t, setLang: setLang, getLang: getLang, STRINGS: T };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GanoI18n = api;
})(typeof self !== 'undefined' ? self : this);
