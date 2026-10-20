// Bölüm, dünya, görünüm ve hikâye tanımları. Koordinatlar 1600x893'lük "dünya" üzerinde.
//
// Bölüm alanları:
//   paths      : bir veya iki yol (kontrol noktaları). İlk nokta kapı, son nokta hazine sandığı.
//   shooter    : atıcının konumu
//   colors     : renk sayısı (3-6), count: top sayısı (her yol için), speed: zincir hızı
//   pw         : güçlendirici top olasılığı
//   special    : { ice, joker, gold } özel top olasılıkları
//   goal       : { type: 'clear' } (varsayılan) | { type: 'gold', n } | { type: 'survive', t } | { type: 'boss', hp }
//   obstacles  : [x, y] sabit sütun | { x, y, orbit: [cx, cy, r, hız] } dönen | { x, y, blink: [açık, kapalı] } yanıp sönen
//   tunnels    : [x0, y0, x1, y1] kutusu içindeki yol köprü altından geçer
//   portals    : [[yolNo, başlangıçNoktası, bitişNoktası]] bu kontrol noktaları arası görünmez (ışınlanma)
(function () {
  const mirror = pts => pts.map(p => [1600 - p[0], p[1]]);
  const mirrorY = pts => pts.map(p => [p[0], 893 - p[1]]);
  const flip = pts => pts.map(p => [1600 - p[0], 893 - p[1]]);

  const SPIRAL = [
    [800, 168], [800, 215], [660, 228], [490, 242], [398, 318], [378, 470], [398, 636],
    [505, 712], [800, 726], [1095, 712], [1204, 636], [1224, 470], [1206, 322], [1128, 258],
    [1010, 252], [935, 318], [800, 334], [625, 340], [530, 402], [518, 560], [605, 628],
    [800, 640], [995, 628], [1080, 560], [1084, 450], [1035, 404], [975, 398]
  ];
  const SERPENTINE = [
    [800, 168], [800, 230], [808, 292], [860, 336], [960, 338], [1028, 352], [1050, 396],
    [1028, 440], [960, 454], [800, 455], [640, 454], [588, 470], [568, 512], [588, 556],
    [640, 572], [800, 574], [930, 574], [985, 574]
  ];
  const LEFTDOOR = [
    [262, 440], [330, 442], [388, 410], [402, 318], [478, 240], [800, 226], [1122, 240],
    [1208, 312], [1226, 470], [1208, 640], [1118, 714], [800, 728], [482, 714], [404, 652],
    [432, 598], [506, 548], [520, 430], [592, 340], [800, 326], [1008, 338], [1086, 420],
    [1088, 548], [1010, 624], [800, 636], [668, 624]
  ];
  const SNAKE = [
    [800, 168], [800, 210], [760, 248], [640, 252], [470, 252], [408, 278], [392, 306],
    [408, 336], [470, 362], [800, 364], [1130, 362], [1192, 388], [1208, 418], [1192, 448],
    [1130, 474], [800, 476], [470, 474], [408, 500], [392, 530], [408, 560], [470, 586],
    [800, 588], [990, 588], [1040, 588]
  ];
  const TWIN_L = [
    [262, 440], [330, 444], [390, 404], [412, 320], [470, 258], [560, 236], [640, 256],
    [684, 320], [692, 440], [682, 580], [640, 664], [560, 700], [470, 680], [420, 620],
    [430, 560], [470, 528], [512, 512]
  ];
  const ZIGZAG = [
    [262, 440], [340, 440], [395, 410], [410, 350], [410, 300], [430, 262], [472, 246],
    [514, 262], [534, 300], [534, 650], [554, 688], [596, 704], [638, 688], [658, 650],
    [658, 300], [678, 262], [720, 246], [762, 262], [782, 300], [782, 650], [802, 688],
    [844, 704], [886, 688], [906, 650], [906, 430]
  ];
  const QUAD = [
    [800, 168], [800, 212], [740, 236], [600, 242], [472, 248], [408, 300], [398, 420],
    [432, 500], [520, 534], [610, 522], [662, 452], [652, 362], [592, 318], [522, 332],
    [494, 396], [536, 440]
  ];
  // dış halka, sağ ortada portala girer, sol iç halkadan çıkar
  const PORTAL = [
    [800, 168], [800, 215], [660, 228], [490, 242], [398, 318], [378, 470], [398, 636],
    [505, 712], [800, 726], [1095, 712], [1204, 636], [1226, 520], [1226, 470],
    [870, 470],
    [520, 470], [530, 390], [610, 336], [800, 324], [990, 336], [1078, 410], [1086, 560],
    [1000, 630], [800, 642], [670, 626]
  ];
  const PORTAL_IN = 12, PORTAL_OUT = 14;

  const P = {
    SPIRAL, SPIRAL_M: mirror(SPIRAL), SPIRAL_Y: mirrorY(SPIRAL),
    SERPENTINE, SERP_M: mirror(SERPENTINE), SERP_Y: mirrorY(SERPENTINE),
    LEFTDOOR, RIGHTDOOR: mirror(LEFTDOOR), SNAKE, SNAKE_M: mirror(SNAKE),
    TWIN_L, TWIN_R: mirror(TWIN_L), ZIGZAG, ZIGZAG_M: mirror(ZIGZAG),
    QUAD_A: QUAD, QUAD_B: flip(QUAD), PORTAL, PORTAL_M: mirror(PORTAL)
  };
  const SH = { SPIRAL: [800, 482], SPIRAL_Y: [800, 411], SERP: [800, 702], SERP_Y: [800, 191], LEFT: [800, 482], SNAKE: [800, 712], TWIN: [800, 480], ZIG: [1130, 470], ZIG_M: [470, 470], QUAD: [800, 446], PORTAL: [800, 482] };

  // Zeminler: hava efekti ve müzik teması
  window.BGS = {
    bg1: { weather: 'pollen' }, bg2: { weather: 'pollen' },
    bg3: { weather: 'embers' }, bg4: { weather: 'embers' },
    bg5: { weather: 'fireflies', night: true }, bg6: { weather: 'fireflies', night: true },
    bg7: { weather: 'leaves' }, bg8: { weather: 'leaves' },
    bg9: { weather: 'snow' }, bg10: { weather: 'snow' },
    bg11: { weather: 'rain', night: true }, bg12: { weather: 'rain', night: true }
  };

  window.WORLDS = [
    { name: 'Saray Bahçesi', from: 0, to: 4, bg: 'bg1', theme: 0 },
    { name: 'Gün Batımı', from: 5, to: 9, bg: 'bg3', theme: 1 },
    { name: 'Kraliyet Gecesi', from: 10, to: 14, bg: 'bg5', theme: 2 },
    { name: 'Sonbahar Bahçesi', from: 15, to: 19, bg: 'bg7', theme: 3 },
    { name: 'Kış Sarayı', from: 20, to: 24, bg: 'bg9', theme: 4 },
    { name: 'Fırtına Gecesi', from: 25, to: 29, bg: 'bg11', theme: 5 }
  ];

  const L = (o) => o;
  window.LEVELS = [
    // ---------- Dünya 1: Saray Bahçesi ----------
    L({ name: 'Saray Bahçesi', bg: 'bg1', paths: [P.SPIRAL], shooter: SH.SPIRAL, colors: 4, count: 50, speed: 32, pw: 0 }),
    L({ name: 'Çiçek Tarhları', bg: 'bg2', paths: [P.SERPENTINE], shooter: SH.SERP, colors: 4, count: 40, speed: 26, pw: 0 }),
    L({ name: 'Yan Kapı', bg: 'bg1', paths: [P.LEFTDOOR], shooter: SH.LEFT, colors: 4, count: 58, speed: 33, pw: 0.06 }),
    L({ name: 'Gül Yolu', bg: 'bg2', paths: [P.SERP_M], shooter: SH.SERP, colors: 4, speed: 26, pw: 0.06, special: { gold: 0.09 }, goal: { type: 'gold', n: 6 } }),
    L({ name: 'Hırsızın İzi', bg: 'bg1', paths: [P.SPIRAL_M], shooter: SH.SPIRAL, colors: 4, speed: 29, pw: 0.06, goal: { type: 'boss', hp: 80 }, obstacles: [[950, 500], [660, 560]] }),
    // ---------- Dünya 2: Gün Batımı ----------
    L({ name: 'Yılan Yolu', bg: 'bg3', paths: [P.SNAKE], shooter: SH.SNAKE, colors: 5, count: 62, speed: 30, pw: 0.06, obstacles: [[620, 668], [980, 668]] }),
    L({ name: 'Gizli Köprü', bg: 'bg4', paths: [P.SERPENTINE], shooter: SH.SERP, colors: 5, speed: 27, pw: 0.06, goal: { type: 'survive', t: 75 }, tunnels: [[730, 420, 870, 490]] }),
    L({ name: 'İkiz Kapılar', bg: 'bg3', paths: [P.TWIN_L, P.TWIN_R], shooter: SH.TWIN, colors: 4, count: 34, speed: 25, pw: 0.06 }),
    L({ name: 'Buz Tuzakları', bg: 'bg3', paths: [P.RIGHTDOOR], shooter: SH.LEFT, colors: 5, count: 66, speed: 35, pw: 0.06, special: { ice: 0.08 }, obstacles: [[650, 480], [950, 480]] }),
    L({ name: 'Kemer Altı Baskını', bg: 'bg4', paths: [P.SERP_M], shooter: SH.SERP, colors: 5, speed: 28, pw: 0.07, goal: { type: 'boss', hp: 110 }, tunnels: [[730, 420, 870, 490]], obstacles: [[640, 668], [960, 668]] }),
    // ---------- Dünya 3: Kraliyet Gecesi ----------
    L({ name: 'Ay Işığı', bg: 'bg5', paths: [P.SPIRAL], shooter: SH.SPIRAL, colors: 5, count: 76, speed: 38, pw: 0.07, tunnels: [[690, 690, 910, 770]] }),
    L({ name: 'Gece Hazinesi', bg: 'bg6', paths: [P.SERPENTINE], shooter: SH.SERP, colors: 5, speed: 29, pw: 0.07, special: { gold: 0.09 }, goal: { type: 'gold', n: 8 }, obstacles: [[640, 668], [960, 668]] }),
    L({ name: 'Gölgeler', bg: 'bg5', paths: [P.TWIN_L, P.TWIN_R], shooter: SH.TWIN, colors: 5, count: 40, speed: 27, pw: 0.07, special: { ice: 0.05 } }),
    L({ name: 'Sihirli Kapı', bg: 'bg5', paths: [P.PORTAL], portals: [[0, PORTAL_IN, PORTAL_OUT]], shooter: SH.PORTAL, colors: 5, count: 72, speed: 36, pw: 0.07, special: { joker: 0.03 } }),
    L({ name: 'Gece Baskını', bg: 'bg6', paths: [P.SERP_M], shooter: SH.SERP, colors: 6, speed: 30, pw: 0.08, goal: { type: 'boss', hp: 140 }, special: { ice: 0.05 }, tunnels: [[730, 420, 870, 490]] }),
    // ---------- Dünya 4: Sonbahar Bahçesi ----------
    L({ name: 'Sonbahar Yaprakları', bg: 'bg7', paths: [P.ZIGZAG], shooter: SH.ZIG, colors: 5, count: 62, speed: 30, pw: 0.07 }),
    L({ name: 'Dönen Sütunlar', bg: 'bg7', paths: [P.SPIRAL_Y], shooter: SH.SPIRAL_Y, colors: 5, count: 68, speed: 34, pw: 0.07, obstacles: [{ x: 640, y: 411, orbit: [640, 411, 40, 1.4] }, { x: 940, y: 352, orbit: [940, 352, 26, -1.4] }] }),
    L({ name: 'Altın Hasat', bg: 'bg8', paths: [P.SERP_Y], shooter: SH.SERP_Y, colors: 5, speed: 29, pw: 0.07, special: { gold: 0.1 }, goal: { type: 'gold', n: 10 } }),
    L({ name: 'Dört Köşe', bg: 'bg7', paths: [P.QUAD_A, P.QUAD_B], shooter: SH.QUAD, colors: 5, count: 40, speed: 27, pw: 0.07, special: { joker: 0.03 } }),
    L({ name: 'Rakun Ambarı', bg: 'bg8', paths: [P.ZIGZAG_M], shooter: SH.ZIG_M, colors: 5, speed: 31, pw: 0.08, goal: { type: 'boss', hp: 160 }, special: { ice: 0.05 } }),
    // ---------- Dünya 5: Kış Sarayı ----------
    L({ name: 'Kar Yolu', bg: 'bg9', paths: [P.PORTAL_M], portals: [[0, PORTAL_IN, PORTAL_OUT]], shooter: SH.PORTAL, colors: 5, count: 74, speed: 36, pw: 0.07, special: { ice: 0.08 } }),
    L({ name: 'Donmuş Tarhlar', bg: 'bg10', paths: [P.SERPENTINE], shooter: SH.SERP, colors: 6, speed: 28, pw: 0.07, special: { ice: 0.08 }, goal: { type: 'survive', t: 90 } }),
    L({ name: 'Kristal Köprü', bg: 'bg9', paths: [P.SNAKE_M], shooter: SH.SNAKE, colors: 6, count: 68, speed: 33, pw: 0.07, special: { joker: 0.03 }, tunnels: [[730, 440, 870, 510]] }),
    L({ name: 'Buz Sarayı', bg: 'bg9', paths: [P.QUAD_A, P.QUAD_B], shooter: SH.QUAD, colors: 6, count: 44, speed: 29, pw: 0.07, special: { ice: 0.1 }, obstacles: [{ x: 1120, y: 248, orbit: [1120, 248, 40, 1.2] }, { x: 480, y: 648, orbit: [480, 648, 40, 1.2] }] }),
    L({ name: 'Kış Hırsızı', bg: 'bg10', paths: [P.SERP_Y], shooter: SH.SERP_Y, colors: 6, speed: 30, pw: 0.08, goal: { type: 'boss', hp: 170 }, special: { ice: 0.07 } }),
    // ---------- Dünya 6: Fırtına Gecesi ----------
    L({ name: 'Fırtına Öncesi', bg: 'bg11', paths: [P.LEFTDOOR], shooter: SH.LEFT, colors: 6, count: 82, speed: 40, pw: 0.08, tunnels: [[690, 690, 910, 770]], obstacles: [{ x: 650, y: 480, blink: [3, 2] }, { x: 960, y: 480, blink: [3, 2, 2.5] }] }),
    L({ name: 'Şimşek Yolu', bg: 'bg12', paths: [P.SERP_Y], shooter: SH.SERP_Y, colors: 6, speed: 32, pw: 0.08, special: { gold: 0.1, ice: 0.04 }, goal: { type: 'gold', n: 12 } }),
    L({ name: 'Sel Kapıları', bg: 'bg11', paths: [P.TWIN_L, P.TWIN_R], shooter: SH.TWIN, colors: 6, count: 46, speed: 31, pw: 0.08, special: { ice: 0.06 }, obstacles: [{ x: 800, y: 280, orbit: [800, 280, 30, 1.6] }, { x: 800, y: 690, orbit: [800, 690, 30, -1.6] }] }),
    L({ name: 'Son Portal', bg: 'bg11', paths: [P.PORTAL], portals: [[0, PORTAL_IN, PORTAL_OUT]], shooter: SH.PORTAL, colors: 6, count: 86, speed: 41, pw: 0.08, special: { joker: 0.03, ice: 0.05 } }),
    L({ name: 'Büyük Hırsız', bg: 'bg12', paths: [P.SERPENTINE], shooter: SH.SERP, colors: 6, speed: 33, pw: 0.09, goal: { type: 'boss', hp: 240 }, special: { ice: 0.06, joker: 0.02 }, tunnels: [[730, 420, 870, 490]], obstacles: [{ x: 640, y: 668, blink: [3, 1.5] }, { x: 960, y: 668, blink: [3, 1.5, 2.2] }] })
  ];

  // Sonsuz mod
  window.SURVIVAL = { name: 'Sonsuz Mod', bg: 'bg3', paths: [P.SPIRAL], shooter: SH.SPIRAL, colors: 4, speed: 30, pw: 0.06, special: { ice: 0.03, joker: 0.02 }, survival: true, theme: 1 };

  // Haftalık kupa için havuz (hafta numarasına göre seçilir)
  window.WEEKLY_POOL = [
    { paths: [P.SPIRAL], shooter: SH.SPIRAL }, { paths: [P.LEFTDOOR], shooter: SH.LEFT }, { paths: [P.SNAKE], shooter: SH.SNAKE },
    { paths: [P.ZIGZAG], shooter: SH.ZIG }, { paths: [P.PORTAL], shooter: SH.PORTAL, portals: [[0, PORTAL_IN, PORTAL_OUT]] },
    { paths: [P.SPIRAL_Y], shooter: SH.SPIRAL_Y }, { paths: [P.RIGHTDOOR], shooter: SH.LEFT }, { paths: [P.ZIGZAG_M], shooter: SH.ZIG_M }
  ];

  window.PATHS = P;
  window.BALL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan'];
  window.BALL_HEX = { red: '#ff3b52', blue: '#3d8bff', green: '#36d65a', yellow: '#ffd43a', purple: '#b45cff', cyan: '#2fe0f0', '*': '#ffffff' };
  window.SKINS = [
    { id: 'classic', name: 'Klasik', stars: 0 },
    { id: 'glass', name: 'Işıltı', stars: 9 },
    { id: 'candy', name: 'Şeker', stars: 20 },
    { id: 'gold', name: 'Altın', stars: 33 },
    { id: 'crystal', name: 'Kristal', stars: 45 },
    { id: 'marble', name: 'Kaplan', stars: 58 },
    { id: 'neon', name: 'Neon', stars: 72 }
  ];
  window.CANNONS = [
    { id: 'royal', name: 'Kraliyet', stars: 0, file: 'cannon' },
    { id: 'emerald', name: 'Zümrüt', stars: 15, file: 'cannon_emerald' },
    { id: 'sapphire', name: 'Safir', stars: 30, file: 'cannon_sapphire' },
    { id: 'silver', name: 'Ametist', stars: 50, file: 'cannon_silver' },
    { id: 'night', name: 'Gece', stars: 70, file: 'cannon_night' }
  ];
  window.POWERS = {
    slow: { icon: '⏳', name: 'Yavaşlatma', time: 6 },
    back: { icon: '⏪', name: 'Geri İtme', time: 2.4 },
    bomb: { icon: '💣', name: 'Bomba', time: 0 },
    aim: { icon: '🎯', name: 'Nişan Dürbünü', time: 10 },
    paint: { icon: '🎨', name: 'Boya', time: 0 }
  };
  window.GOAL_TEXT = {
    clear: () => 'Tüm mücevherleri temizle',
    gold: g => g.n + ' altın top topla',
    survive: g => g.t + ' saniye dayan',
    boss: () => 'Rakun Rüstem\'i yen!'
  };

  // Hikâye: 'o' = Bilge Baykuş, 'r' = Rakun Rüstem
  window.STORY = {
    intro: { before: 0, lines: [
      ['o', 'Majesteleri! Kraliyet hazinesi tehlikede!'],
      ['o', 'Sihirli mücevher zincirleri saraydan çıkıp hazine sandığına doğru yuvarlanıyor.'],
      ['o', 'Topçu kulemizi kullan: aynı renkten üç mücevheri yan yana getir, patlasınlar!']
    ] },
    power: { before: 2, lines: [
      ['o', 'Dikkat! Bazı mücevherler parlıyor.'],
      ['o', 'Onları patlatırsan güç kazanırsın: ⏳ yavaşlatma, ⏪ geri itme, 💣 bomba, 🎯 nişan dürbünü ve 🎨 boya.'],
      ['o', 'Zincirin iki parçası arasındaki boşluktan geçirerek vurursan ekstra puan alırsın!']
    ] },
    gold: { before: 3, lines: [
      ['o', 'Bu bahçede üstünde altın para olan mücevherler var.'],
      ['o', 'Hedef: onları patlatıp yeterince altın toplamak. Zincir bitmez, acele et!']
    ] },
    boss1: { before: 4, lines: [
      ['r', 'Hehe! Ben Rakun Rüstem, krallığın en usta hırsızı!'],
      ['r', 'Bu mücevherleri sandığa ben gönderiyorum. Durdurabilirsen durdur!'],
      ['o', 'Her patlattığın mücevher ona zarar verir. Canı bitene kadar dayan!']
    ] },
    world2: { before: 5, lines: [
      ['o', 'Rüstem kaçtı ama gün batımı bahçelerine saklandı.'],
      ['o', 'Burada taş sütunlar ve köprüler var. Köprünün altındaki mücevherleri vuramazsın.']
    ] },
    survive: { before: 6, lines: [['o', 'Bu bölümde zincir hiç bitmiyor. Süre dolana kadar sandığı koru!']] },
    twin: { before: 7, lines: [['o', 'İki kapı birden açıldı! İki zincir, iki sandık. Hangisi yaklaşıyorsa ona öncelik ver.']] },
    ice: { before: 8, lines: [
      ['r', 'Biraz buz ekleyelim, ne dersin? Hihi!'],
      ['o', 'Buzlu mücevherler eşleşmez. Önce bir atışla buzu kır ya da yanındakileri patlat.']
    ] },
    world3: { before: 10, lines: [['o', 'Gece çöktü. Zincirler hızlanıyor, renkler çoğalıyor. Krallık sana güveniyor!']] },
    portal: { before: 13, lines: [
      ['o', 'Sihirli bir kapı! Zincir bir yerden girip başka yerden çıkıyor.'],
      ['o', 'Bir de 🌈 gökkuşağı mücevher var: her renkle eşleşir.']
    ] },
    world4: { before: 15, lines: [
      ['r', 'Sonbahar bahçeleri benim! Yapraklar arasında kaybolursun.'],
      ['o', 'Bu sefer kulemiz yan tarafta. Açıları iyi hesapla.']
    ] },
    world5: { before: 20, lines: [['o', 'Kış Sarayı buz tuzaklarıyla dolu. Soğukkanlı ol!']] },
    world6: { before: 25, lines: [
      ['r', 'Fırtına benim en sevdiğim hava! Sütunlarım belirip kayboluyor, yakala beni yakalayabilirsen!'],
      ['o', 'Son dünya. Rüstem\'i burada durdurmalıyız!']
    ] },
    ending: { after: 29, lines: [
      ['r', 'Tamam, tamam! Pes ediyorum... Hazineyi geri veriyorum.'],
      ['o', 'Başardın! Krallık kurtuldu, hazine güvende!'],
      ['o', 'Sonsuz Mod ve Haftalık Kupa seni bekliyor. Rekorlarını geliştir!']
    ] }
  };
})();
