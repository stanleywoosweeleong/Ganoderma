/* Ganoderma BSR Manager — translations (en / ms / zh). */
(function (root) {
  'use strict';
  const T = {
    'app.title': { en: 'Ganoderma BSR Manager', ms: 'Pengurus Reput Pangkal Batang Ganoderma', zh: '灵芝茎基腐病管理' },
    'app.short': { en: 'BSR Manager', ms: 'Pengurus BSR', zh: '灵芝茎基腐病管理' },
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
    'flow.h': { en: 'How the treatment test works', ms: 'Cara ujian rawatan berfungsi', zh: '处理试验如何进行' },
    'flow.1.t': { en: 'Assess', ms: 'Nilai', zh: '评估' },
    'flow.1.d': { en: 'Score a palm 0–4 from its symptoms.', ms: 'Beri skor 0–4 kepada pokok berdasarkan simptom.', zh: '按症状给棕树评 0–4 级。' },
    'flow.2.t': { en: 'Plan the batches', ms: 'Rancang kelompok', zh: '规划批次' },
    'flow.2.d': { en: 'Get dated treatment batches (Batch 1, 2, 3 …) and tick each one off as you do it.', ms: 'Dapatkan kelompok rawatan bertarikh (Kelompok 1, 2, 3 …) dan tandakan setiap satu selepas dibuat.', zh: '获得带日期的处理批次(第 1、2、3 批…),完成后逐一勾选。' },
    'flow.3.t': { en: 'Brew Trichoderma', ms: 'Hasilkan Trichoderma', zh: '自制木霉' },
    'flow.3.d': { en: 'When to start each brew so it is ready for its batch.', ms: 'Bila mula menghasilkan supaya siap untuk kelompoknya.', zh: '何时开始制作,确保每批按时备好。' },
    'flow.4.t': { en: 'Track the test', ms: 'Jejak ujian', zh: '追踪试验' },
    'flow.4.d': { en: 'Census treated and untreated blocks and compare disease over time.', ms: 'Banci blok dirawat dan tidak dirawat, bandingkan penyakit dari masa ke masa.', zh: '普查处理区与对照区,比较病害随时间的变化。' },
    'plan.progress': { en: '{d} of {n} treatment batches done', ms: '{d} daripada {n} kelompok rawatan selesai', zh: '已完成 {d} / {n} 个处理批次' },
    'plan.settings': { en: 'Change plan settings (situation, stage, start date)', ms: 'Ubah tetapan pelan (situasi, peringkat, tarikh mula)', zh: '修改方案设置(情况、病级、开始日期)' },
    'plan.weeks': { en: 'weeks', ms: 'minggu', zh: '周' },
    'agent.tricho': { en: 'Trichoderma', ms: 'Trichoderma', zh: '木霉' },
    'agent.bacteria': { en: 'Bacteria', ms: 'Bakteria', zh: '细菌' },
    'agent.amf': { en: 'Mycorrhiza', ms: 'Mikoriza', zh: '菌根' },
    'agent.sanitation': { en: 'Clean-up', ms: 'Sanitasi', zh: '清理' },
    'plan.done': { en: 'Done', ms: 'Selesai', zh: '已完成' },
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
      en: 'Bacterial treatment around the trunk base, at label rate: iM-bioGuard (Pseudomonas + Bacillus, liquid drench ~5–10 L per palm) or EMBIO actinoPLUS (Streptomyces granules, buried near the base). Other Bacillus soil boosters are not proven against Ganoderma — use only as an extra, never instead. Do not mix with copper or fungicides.',
      ms: 'Rawatan bakteria sekeliling pangkal batang, pada kadar label: iM-bioGuard (Pseudomonas + Bacillus, siraman cecair ~5–10 L setiap pokok) atau EMBIO actinoPLUS (butiran Streptomyces, ditanam berhampiran pangkal). Penggalak tanah Bacillus lain belum terbukti terhadap Ganoderma — guna sebagai tambahan sahaja, bukan pengganti. Jangan campur dengan kuprum atau racun kulat.',
      zh: '树干基部细菌处理,按标签用量:iM-bioGuard(假单胞菌 + 芽孢杆菌,液体灌根,每棵约 5–10 L)或 EMBIO actinoPLUS(链霉菌颗粒,埋于树基附近)。其他芽孢杆菌土壤增强剂未被证实可防治灵芝病 — 只能作为额外补充,不可替代。不可与铜制剂或杀菌剂混用。'
    },
    'step.bact.drench.nursery': {
      en: 'Bacterial treatment at label rate: iM-bioGuard (~0.5 L drench per polybag) or EMBIO actinoPLUS (~50 g per polybag). Other Bacillus boosters are extras only.',
      ms: 'Rawatan bakteria pada kadar label: iM-bioGuard (siraman ~0.5 L setiap polibag) atau EMBIO actinoPLUS (~50 g setiap polibag). Penggalak Bacillus lain sebagai tambahan sahaja.',
      zh: '按标签用量进行细菌处理:iM-bioGuard(每袋灌根约 0.5 L)或 EMBIO actinoPLUS(每袋约 50 g)。其他芽孢杆菌增强剂只作额外补充。'
    },
    'step.amf.hole': { en: 'Mycorrhiza (AMF, e.g. Glomus): label rate into the planting hole, touching the roots.', ms: 'Mikoriza (AMF, cth. Glomus): kadar label ke dalam lubang tanam, bersentuhan dengan akar.', zh: '菌根真菌(AMF,如球囊霉):按标签用量放入种植穴,接触根系。' },
    'step.amf.nursery': { en: 'Mycorrhiza (AMF): product label rate per polybag at transplanting.', ms: 'Mikoriza (AMF): kadar label produk setiap polibag semasa pindah tanam.', zh: '菌根真菌(AMF):移栽时每袋按产品标签用量。' },
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
    'warn.early': { en: 'Trichoderma studies applied it to seedlings BEFORE infection. A benefit for palms already showing symptoms has not been shown — sanitation and protecting neighbouring palms matter most.', ms: 'Kajian Trichoderma memberikannya kepada anak benih SEBELUM jangkitan. Manfaat untuk pokok yang sudah bersimptom belum dibuktikan — sanitasi dan melindungi pokok jiran paling penting.', zh: '木霉研究是在感染前施于幼苗。对已出现症状的棕树是否有效尚未证实 — 卫生措施和保护邻近棕树最重要。' },
    'warn.moderate': { en: 'Chance of recovery is low. The aim is to slow decline, keep the palm producing, and protect neighbours.', ms: 'Peluang pulih adalah rendah. Matlamatnya melambatkan kemerosotan, mengekalkan hasil dan melindungi pokok jiran.', zh: '康复机会低。目标是延缓衰退、维持产量并保护邻近棕树。' },
    'warn.severe': { en: 'No microbe can save this palm. Remove it properly so it stops infecting others.', ms: 'Tiada mikrob boleh menyelamatkan pokok ini. Buang dengan betul supaya ia berhenti menjangkiti pokok lain.', zh: '没有任何微生物能挽救这棵棕树。请正确清除,以免继续传染其他棕树。' },
    'warn.neighbours': { en: 'Also run the Healthy (prevention) plan on the 1–2 rings of palms around this one.', ms: 'Jalankan juga pelan Sihat (pencegahan) pada 1–2 lingkaran pokok di sekelilingnya.', zh: '同时对周围 1–2 圈棕树执行「健康(预防)」方案。' },
    'warn.chemical': { en: 'If you also use hexaconazole trunk injection, it may harm Trichoderma. The 4-week gap checked here is an app assumption, not from a study — enter injection dates to check.', ms: 'Jika anda juga menggunakan suntikan heksakonazol, ia mungkin menjejaskan Trichoderma. Jarak 4 minggu yang disemak di sini ialah andaian aplikasi, bukan daripada kajian — masukkan tarikh suntikan untuk semak.', zh: '若同时使用己唑醇树干注射,可能会伤害木霉。此处检查的 4 周间隔为本应用假设,并非来自研究 — 输入注射日期可自动检查。' },
    'warn.replant': { en: 'Remove all old trunks and root masses before planting. Treat every planting hole.', ms: 'Buang semua batang dan akar lama sebelum menanam. Rawat setiap lubang tanam.', zh: '种植前清除所有旧树干和根团,每个种植穴都要处理。' },
    'warn.nursery': { en: 'Most trial evidence comes from treating seedlings before infection (Trichoderma, AMF, Pseudomonas). Continuing treatment after field planting is an app assumption.', ms: 'Kebanyakan bukti percubaan datang daripada merawat anak benih sebelum jangkitan (Trichoderma, AMF, Pseudomonas). Meneruskan rawatan selepas tanam di ladang ialah andaian aplikasi.', zh: '大部分试验证据来自感染前处理幼苗(木霉、菌根、假单胞菌)。定植田间后继续处理为本应用假设。' },

    'safety.pseudomonas': {
      en: '⚠ Safety: iM-bioGuard contains Pseudomonas aeruginosa, an opportunistic human pathogen. Soil drench only — never spray on leaves or food crops. Wear gloves and eye protection; cover any cuts first. People with weak immunity, lung disease or open wounds should not handle it. Never brew or multiply it at home. See a doctor if a wound or eye becomes red or swollen after use.',
      ms: '⚠ Keselamatan: iM-bioGuard mengandungi Pseudomonas aeruginosa, patogen oportunis manusia. Siraman tanah sahaja — jangan sembur pada daun atau tanaman makanan. Pakai sarung tangan dan pelindung mata; tutup luka terlebih dahulu. Orang yang lemah imun, berpenyakit paru-paru atau mempunyai luka terbuka tidak patut mengendalikannya. Jangan sekali-kali membiak atau menghasilkannya sendiri. Jumpa doktor jika luka atau mata menjadi merah atau bengkak selepas penggunaan.',
      zh: '⚠ 安全提示:iM-bioGuard 含铜绿假单胞菌,是人类机会性病原菌。仅限土壤灌根 — 切勿喷洒在叶面或食用作物上。请戴手套和护目镜,先包好伤口。免疫力低下、患肺病或有开放性伤口者不应接触。切勿自行培养或扩繁。使用后如伤口或眼睛红肿,请就医。'
    },

    'plan.provisional.h': { en: 'Provisional plan.', ms: 'Pelan sementara.', zh: '暂定方案。' },
    'plan.provisional': {
      en: 'These are planning assumptions, not a tested programme. Studies tested single preventive treatments on seedlings; the doses, repeat intervals and combination of products here have not been tested together. Each step shows what it is based on.',
      ms: 'Ini ialah andaian perancangan, bukan program yang telah diuji. Kajian menguji rawatan pencegahan tunggal pada anak benih; dos, selang ulangan dan gabungan produk di sini belum diuji bersama. Setiap langkah menunjukkan asasnya.',
      zh: '这些是规划假设,并非经过测试的方案。研究测试的是对幼苗的单次预防处理;此处的用量、重复间隔和产品组合未曾一起测试。每个步骤都注明了依据。'
    },
    'basis.study': { en: 'From a study', ms: 'Daripada kajian', zh: '来自研究' },
    'basis.label': { en: 'Product label', ms: 'Label produk', zh: '产品标签' },
    'basis.practice': { en: 'Common practice', ms: 'Amalan biasa', zh: '常规做法' },
    'basis.assumption': { en: 'App assumption', ms: 'Andaian aplikasi', zh: '本应用假设' },

    // Brew
    'brew.h': { en: 'Trichoderma brewing schedule', ms: 'Jadual penghasilan Trichoderma', zh: '木霉自制排程' },
    'brew.intro': { en: 'Rice-grain recipe (from AMIS): cook plain rice, cool, mix 1 g starter per 500 g rice, incubate in shade 5–7 days until green, shade-dry. Use within 2 months. The 30% failure allowance is an assumption carried over from the AMIS recipe, not a measured rate — change it to match your own results.', ms: 'Resipi beras (daripada AMIS): masak nasi kosong, sejukkan, campur 1 g pemula setiap 500 g nasi, eram di tempat teduh 5–7 hari sehingga hijau, kering di tempat teduh. Guna dalam 2 bulan. Peruntukan kegagalan 30% ialah andaian daripada resipi AMIS, bukan kadar yang diukur — ubah mengikut keputusan anda sendiri.', zh: '米粒配方(来自 AMIS):白米煮熟放凉,每 500 g 米拌 1 g 菌种,阴凉处培养 5–7 天至转绿,阴干。2 个月内用完。30% 失败率是沿用 AMIS 配方的假设,并非实测 — 请按自己的结果调整。' },
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
    'track.comparedOn': { en: 'Latest incidence and DSI compared on {d}, the latest date both blocks were censused.', ms: 'Insiden dan DSI terkini dibandingkan pada {d}, tarikh terkini kedua-dua blok dibanci.', zh: '最新发病率与病情指数以 {d} 比较,即两个区块最近一次同日普查。' },
    'track.noSharedDate': { en: 'Latest incidence and DSI: n/a — census both blocks on the same date to compare them.', ms: 'Insiden dan DSI terkini: t/b — banci kedua-dua blok pada tarikh yang sama untuk membandingkan.', zh: '最新发病率与病情指数:无 — 请在同一天普查两个区块才能比较。' },
    'track.overPeriod': { en: 'AUDPC compared over the same period for both blocks: {a} to {b}.', ms: 'AUDPC dibandingkan bagi tempoh yang sama untuk kedua-dua blok: {a} hingga {b}.', zh: 'AUDPC 以两个区块相同的时段比较:{a} 至 {b}。' },
    'track.noOverlap': { en: 'AUDPC: n/a — the blocks were not observed over a common period.', ms: 'AUDPC: t/b — blok tidak diperhatikan dalam tempoh yang sama.', zh: 'AUDPC:无 — 两个区块没有共同的观察时段。' },
    'track.na': { en: 'n/a', ms: 't/b', zh: '无' },
    'track.empty': { en: 'No blocks yet.', ms: 'Belum ada blok.', zh: '尚无区块。' },
    'track.export': { en: 'Export CSV', ms: 'Eksport CSV', zh: '导出 CSV' },
    'track.backup': { en: 'Backup (JSON)', ms: 'Sandaran (JSON)', zh: '备份 (JSON)' },
    'track.restore': { en: 'Restore', ms: 'Pulihkan', zh: '恢复' },
    'track.restoreNothingChanged': { en: 'Nothing was changed — your saved records are as before.', ms: 'Tiada apa-apa diubah — rekod tersimpan anda kekal seperti sebelum ini.', zh: '未作任何更改 — 已保存的记录保持不变。' },
    'track.restoreConfirm': { en: 'Replace your {m} saved block(s) with the {n} block(s) in this backup? This cannot be undone.', ms: 'Gantikan {m} blok tersimpan anda dengan {n} blok dalam sandaran ini? Tindakan ini tidak boleh dibatalkan.', zh: '用此备份中的 {n} 个区块替换已保存的 {m} 个区块?此操作无法撤销。' },
    'track.restored': { en: 'Restored {n} block(s).', ms: '{n} blok dipulihkan.', zh: '已恢复 {n} 个区块。' },
    'restore.block': { en: 'Block {n} "{name}"', ms: 'Blok {n} "{name}"', zh: '区块 {n}「{name}」' },
    'restore.err.json': { en: 'the file is not valid JSON', ms: 'fail bukan JSON yang sah', zh: '文件不是有效的 JSON' },
    'restore.err.noBlocks': { en: 'the file contains no blocks', ms: 'fail tiada sebarang blok', zh: '文件中没有区块' },
    'restore.err.block': { en: 'not a valid block', ms: 'bukan blok yang sah', zh: '不是有效的区块' },
    'restore.err.name': { en: 'missing name', ms: 'tiada nama', zh: '缺少名称' },
    'restore.err.role': { en: 'unknown role "{v}"', ms: 'peranan tidak dikenali "{v}"', zh: '未知角色「{v}」' },
    'restore.err.censuses': { en: 'census list missing', ms: 'senarai bancian tiada', zh: '缺少普查列表' },
    'restore.err.date': { en: 'invalid date {v}', ms: 'tarikh tidak sah {v}', zh: '日期无效 {v}' },
    'restore.err.dupDate': { en: 'two censuses on {v}', ms: 'dua bancian pada {v}', zh: '{v} 有两次普查' },
    'restore.err.counts': { en: 'invalid palm counts on {v}', ms: 'bilangan pokok tidak sah pada {v}', zh: '{v} 的株数无效' },
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
    'ev.weak': { en: '⚠ Weak evidence', ms: '⚠ Bukti lemah', zh: '⚠ 证据薄弱' },
    'ev.setting': { en: 'Setting', ms: 'Keadaan', zh: '条件' },
    'ev.result': { en: 'Result', ms: 'Keputusan', zh: '结果' },
    'ev.reviews': { en: 'Reviews', ms: 'Ulasan', zh: '综述' },
    'ev.checked': { en: 'Literature search: November 2026. Check original papers before relying on figures.', ms: 'Carian literatur: November 2026. Semak kertas asal sebelum bergantung pada angka.', zh: '文献检索:2026 年 11 月。引用数据前请核对原文。' },

    'lang.label': { en: 'Language', ms: 'Bahasa', zh: '语言' },
    'plan.chem.ph': { en: 'e.g. 2027-02-15, 2027-08-15', ms: 'cth. 2027-02-15, 2027-08-15', zh: '例如 2027-02-15, 2027-08-15' },
    'track.deleteCensus': { en: 'Delete this census', ms: 'Padam bancian ini', zh: '删除此次普查' },

    // Errors (codes come from core.js)
    'err.generic': { en: 'Something went wrong. Check the values and try again.', ms: 'Ada masalah. Semak nilai dan cuba lagi.', zh: '出错了。请检查输入后重试。' },
    'err.lesion': { en: 'Rotten part must be between 0 and 100%.', ms: 'Bahagian reput mesti antara 0 dan 100%.', zh: '腐烂比例必须在 0 到 100% 之间。' },
    'err.foliar': { en: 'Choose a leaf-symptom option.', ms: 'Pilih satu pilihan simptom daun.', zh: '请选择一个叶部症状选项。' },
    'err.counts': { en: 'Enter whole numbers (0 or more) for every class.', ms: 'Masukkan nombor bulat (0 atau lebih) untuk setiap kelas.', zh: '每个等级请输入 0 或以上的整数。' },
    'err.reduction': { en: 'Disease values must be 0 or more.', ms: 'Nilai penyakit mesti 0 atau lebih.', zh: '病害数值必须为 0 或以上。' },
    'err.setting': { en: 'Choose a situation.', ms: 'Pilih satu situasi.', zh: '请选择一种情况。' },
    'err.stage': { en: 'Choose the palm stage (0–4).', ms: 'Pilih peringkat pokok (0–4).', zh: '请选择棕树病级(0–4)。' },
    'err.horizon': { en: 'Plan length must be a whole number of weeks from 1 to 520.', ms: 'Tempoh pelan mesti nombor bulat minggu antara 1 hingga 520.', zh: '方案时长必须是 1 到 520 之间的整数周。' },
    'err.palms': { en: 'Number of palms must be a whole number of 1 or more.', ms: 'Bilangan pokok mesti nombor bulat 1 atau lebih.', zh: '棕树数量必须是 1 或以上的整数。' },
    'err.batchKg': { en: 'Rice per brew must be more than 0 kg.', ms: 'Nasi setiap kelompok mesti lebih daripada 0 kg.', zh: '每批熟米必须大于 0 kg。' },
    'err.failureRate': { en: 'Failure rate must be from 0 to 99%.', ms: 'Kadar kegagalan mesti antara 0 hingga 99%.', zh: '失败率必须在 0 到 99% 之间。' },
    'err.leadDays': { en: 'Brewing lead time must be shorter than the shelf life.', ms: 'Masa penyediaan mesti lebih pendek daripada jangka hayat simpanan.', zh: '制作提前期必须短于保质期。' },
    'err.date': { en: 'Not a valid date: "{v}". Use the format YYYY-MM-DD, e.g. 2027-02-15.', ms: 'Tarikh tidak sah: "{v}". Guna format TTTT-BB-HH, cth. 2027-02-15.', zh: '日期无效:"{v}"。请使用 年-月-日 格式,例如 2027-02-15。' },

    'buy.h': { en: 'Where to buy (Malaysia)', ms: 'Tempat membeli (Malaysia)', zh: '购买渠道(马来西亚)' },
    'buy.none': { en: 'No product found for sale in Malaysia (Nov 2026).', ms: 'Tiada produk ditemui untuk dijual di Malaysia (Nov 2026).', zh: '未找到在马来西亚销售的产品(2026 年 11 月)。' },
    'buy.strainMatch': { en: 'Same strain', ms: 'Strain sama', zh: '相同菌株' },
    'buy.withMpob': { en: 'developed with MPOB', ms: 'dibangunkan bersama MPOB', zh: '与 MPOB 联合开发' },
    'buy.untested': { en: 'No Ganoderma trial listed', ms: 'Tiada percubaan Ganoderma disenaraikan', zh: '未列出灵芝病试验' },
    'buy.contact': { en: 'Contact', ms: 'Hubungi', zh: '联系' },
    'buy.disclaimer': {
      en: 'Products and prices from a web search in November 2026 and may change. This app is not linked to any seller. Before buying, ask for the product registration number and spore/CFU count.',
      ms: 'Produk dan harga daripada carian web pada November 2026 dan mungkin berubah. Aplikasi ini tiada kaitan dengan mana-mana penjual. Sebelum membeli, minta nombor pendaftaran produk dan kiraan spora/CFU.',
      zh: '产品与价格来自 2026 年 11 月的网络搜索,可能有变。本应用与任何卖家无关。购买前请索取产品登记号及孢子/菌落数 (CFU)。'
    },

    'update.ready': { en: 'A new version is ready.', ms: 'Versi baharu sedia.', zh: '新版本已就绪。' },
    'totop': { en: 'Back to top', ms: 'Kembali ke atas', zh: '回到顶部' },
    'update.dismiss': { en: 'Dismiss', ms: 'Tutup', zh: '关闭' },
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
