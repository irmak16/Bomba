// Bölüm tanımları. Koordinatlar 1600x893'lük "dünya" üzerinde.
// paths: bir veya iki yol (kontrol noktaları). İlk nokta başlangıç kapısı, son nokta hazine sandığı.
// obstacles: [x, y] taş sütunlar (atışı keser). tunnels: [x0, y0, x1, y1] kutusu içindeki yol köprü altından geçer.
// pw: zincirde güçlendirici top çıkma olasılığı (0 = yok).
(function () {
  const mirror = pts => pts.map(p => [1600 - p[0], p[1]]);

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

  const P = {
    SPIRAL, SPIRAL_M: mirror(SPIRAL), SERPENTINE, SERP_M: mirror(SERPENTINE),
    LEFTDOOR, RIGHTDOOR: mirror(LEFTDOOR), SNAKE, SNAKE_M: mirror(SNAKE),
    TWIN_L, TWIN_R: mirror(TWIN_L)
  };

  window.WORLDS = [
    { name: 'Saray Bahçesi', from: 0, to: 4, tint: ['#7cc64a', '#3f8f2a'] },
    { name: 'Gün Batımı', from: 5, to: 9, tint: ['#ffb36b', '#d0643a'] },
    { name: 'Kraliyet Gecesi', from: 10, to: 14, tint: ['#6a7fd8', '#2a2f7a'] }
  ];

  window.LEVELS = [
    // --- Dünya 1 ---
    { name: 'Saray Bahçesi', bg: 'bg1', paths: [P.SPIRAL], shooter: [800, 482], colors: 4, count: 50, speed: 32, pw: 0 },
    { name: 'Çiçek Tarhları', bg: 'bg2', paths: [P.SERPENTINE], shooter: [800, 702], colors: 4, count: 40, speed: 26, pw: 0 },
    { name: 'Yan Kapı', bg: 'bg1', paths: [P.LEFTDOOR], shooter: [800, 482], colors: 4, count: 58, speed: 33, pw: 0.06 },
    { name: 'Gül Yolu', bg: 'bg2', paths: [P.SERP_M], shooter: [800, 702], colors: 4, count: 46, speed: 28, pw: 0.06 },
    { name: 'Taş Sütunlar', bg: 'bg1', paths: [P.SPIRAL_M], shooter: [800, 482], colors: 5, count: 60, speed: 33, pw: 0.06, obstacles: [[950, 500], [660, 560]] },
    // --- Dünya 2 ---
    { name: 'Yılan Yolu', bg: 'bg3', paths: [P.SNAKE], shooter: [800, 712], colors: 5, count: 62, speed: 30, pw: 0.06, obstacles: [[620, 668], [980, 668]] },
    { name: 'Gizli Köprü', bg: 'bg4', paths: [P.SERPENTINE], shooter: [800, 702], colors: 5, count: 50, speed: 30, pw: 0.06, tunnels: [[730, 420, 870, 490]] },
    { name: 'İkiz Kapılar', bg: 'bg3', paths: [P.TWIN_L, P.TWIN_R], shooter: [800, 480], colors: 4, count: 34, speed: 25, pw: 0.06 },
    { name: 'Sağ Kanat', bg: 'bg3', paths: [P.RIGHTDOOR], shooter: [800, 482], colors: 5, count: 72, speed: 37, pw: 0.06, obstacles: [[650, 480], [950, 480]] },
    { name: 'Kemer Altı', bg: 'bg4', paths: [P.SERP_M], shooter: [800, 702], colors: 5, count: 56, speed: 32, pw: 0.07, tunnels: [[730, 420, 870, 490]], obstacles: [[640, 668], [960, 668]] },
    // --- Dünya 3 ---
    { name: 'Ay Işığı', bg: 'bg5', paths: [P.SPIRAL], shooter: [800, 482], colors: 5, count: 76, speed: 39, pw: 0.07, tunnels: [[690, 690, 910, 770]] },
    { name: 'Gece Yılanı', bg: 'bg6', paths: [P.SERPENTINE], shooter: [800, 702], colors: 6, count: 52, speed: 31, pw: 0.07, obstacles: [[640, 668], [960, 668]] },
    { name: 'Gölgeler', bg: 'bg5', paths: [P.TWIN_L, P.TWIN_R], shooter: [800, 480], colors: 5, count: 42, speed: 29, pw: 0.07 },
    { name: 'Kraliyet Muhafızı', bg: 'bg5', paths: [P.SNAKE_M], shooter: [800, 712], colors: 6, count: 70, speed: 33, pw: 0.07, tunnels: [[730, 440, 870, 510]] },
    { name: 'Son Savunma', bg: 'bg5', paths: [P.LEFTDOOR], shooter: [800, 482], colors: 6, count: 92, speed: 42, pw: 0.08, obstacles: [[650, 480], [960, 480]], tunnels: [[690, 690, 910, 770]] }
  ];

  // Sonsuz mod
  window.SURVIVAL = { name: 'Sonsuz Mod', bg: 'bg3', paths: [P.SPIRAL], shooter: [800, 482], colors: 4, count: Infinity, speed: 30, pw: 0.06, survival: true };

  window.PATHS = P;
  window.BALL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan'];
  window.BALL_HEX = { red: '#ff3b52', blue: '#3d8bff', green: '#36d65a', yellow: '#ffd43a', purple: '#b45cff', cyan: '#2fe0f0' };
  window.SKINS = [
    { id: 'classic', name: 'Klasik', stars: 0 },
    { id: 'glass', name: 'Işıltı', stars: 9 },
    { id: 'candy', name: 'Şeker', stars: 20 },
    { id: 'gold', name: 'Altın', stars: 33 }
  ];
  window.POWERS = {
    slow: { icon: '⏳', name: 'Yavaşlatma', time: 6 },
    back: { icon: '⏪', name: 'Geri İtme', time: 2.4 },
    bomb: { icon: '💣', name: 'Bomba', time: 0 },
    aim: { icon: '🎯', name: 'Nişan Dürbünü', time: 10 }
  };

  // Hikâye konuşmaları (bir kez gösterilir)
  window.STORY = {
    intro: { before: 0, lines: [
      'Majesteleri! Kraliyet hazinesi tehlikede!',
      'Sihirli mücevher zincirleri saraydan çıkıp hazine sandığına doğru yuvarlanıyor.',
      'Topçu kulemizi kullan: aynı renkten üç mücevheri yan yana getir, patlasınlar!'
    ] },
    power: { before: 2, lines: [
      'Dikkat! Bazı mücevherler parlıyor.',
      'Onları patlatırsan güç kazanırsın: ⏳ yavaşlatma, ⏪ geri itme, 💣 bomba ve 🎯 nişan dürbünü.',
      'Bir de zincirin iki parçası arasındaki boşluktan geçirerek vurursan ekstra puan alırsın!'
    ] },
    world2: { before: 5, lines: [
      'Güneş batıyor ama hırsızlar durmuyor.',
      'Batı bahçelerinde taş sütunlar ve köprüler var. Köprünün altındaki mücevherleri vuramazsın, sabırlı ol.'
    ] },
    twin: { before: 7, lines: [
      'İki kapı birden açıldı! İki zincir, iki sandık.',
      'İkisini de gözünün önünde tut, hangisi yaklaşıyorsa ona öncelik ver.'
    ] },
    world3: { before: 10, lines: [
      'Gece çöktü. Bu son ve en zorlu savunma.',
      'Altı renk, hızlı zincirler... Krallık sana güveniyor!'
    ] },
    ending: { after: 14, lines: [
      'Başardın! Hazine güvende, krallık kurtuldu!',
      'Rekorlarını geliştirmek için Sonsuz Mod seni bekliyor. Ne kadar dayanabilirsin?'
    ] }
  };
})();
