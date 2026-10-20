// Kayıt: ilerleme, ayarlar, istatistikler, günlük görev, başarımlar, görünümler (localStorage)
(function () {
  const KEY = 'kraliyet_zinciri_v2';
  const DEF = {
    unlocked: 1, stars: {}, best: {}, bonusStars: 0, skin: 'classic', cannon: 'royal',
    seenStory: {}, bestSurvival: 0, ach: {}, weekly: { id: '', best: 0, plays: 0 }, mapSeen: 1,
    settings: { sound: true, music: true, vibrate: true, aim: true, colorblind: false, bigBalls: false, lowQuality: false, difficulty: 'normal' },
    stats: { popped: 0, shots: 0, maxCombo: 0, wins: 0, losses: 0, gapShots: 0, powers: 0, played: 0, playTime: 0,
      ice: 0, joker: 0, gold: 0, bosses: 0, bestShot: 0, perfect: 0, lastChanceWins: 0, weeklyPlayed: 0 },
    daily: { date: '', id: '', prog: 0, done: false }
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  function normalize(d) {
    const out = Object.assign(clone(DEF), d);
    out.settings = Object.assign({}, DEF.settings, d.settings || {});
    out.stats = Object.assign({}, DEF.stats, d.stats || {});
    out.daily = Object.assign({}, DEF.daily, d.daily || {});
    out.weekly = Object.assign({}, DEF.weekly, d.weekly || {});
    out.ach = d.ach || {};
    return out;
  }
  let data = clone(DEF);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = normalize(JSON.parse(raw));
    else {
      const old = localStorage.getItem('kraliyet_zinciri_v1');
      if (old) { const o = JSON.parse(old); data.unlocked = o.unlocked || 1; data.stars = o.stars || {}; data.best = o.best || {}; data.settings.sound = o.sound !== false; }
    }
  } catch (_) { }
  const DEV = /[?&]dev=1/.test(location.search);
  if (DEV) data.unlocked = 99;

  function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { } }

  // ---- günlük görev ----
  const QUESTS = [
    { id: 'pop', txt: n => n + ' mücevher patlat', n: 150 },
    { id: 'combo', txt: n => n + 'x kombo yap', n: 3 },
    { id: 'power', txt: n => n + ' güçlendirici kullan', n: 3 },
    { id: 'gap', txt: n => n + ' boşluk atışı yap', n: 2 },
    { id: 'win3', txt: () => 'Bir bölümü 3 yıldızla bitir', n: 1 },
    { id: 'wins', txt: n => n + ' bölüm kazan', n: 2 },
    { id: 'ice', txt: n => n + ' buz kır', n: 8 },
    { id: 'gold', txt: n => n + ' altın top topla', n: 6 }
  ];
  const REWARD = 2;
  function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function hash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function daily() {
    const t = today();
    if (data.daily.date !== t) {
      const q = QUESTS[hash(t) % QUESTS.length];
      data.daily = { date: t, id: q.id, prog: 0, done: false };
      persist();
    }
    const q = QUESTS.find(x => x.id === data.daily.id) || QUESTS[0];
    return { txt: q.txt(q.n), n: q.n, prog: Math.min(q.n, data.daily.prog), done: data.daily.done, reward: REWARD };
  }
  let onDailyDone = null, onAch = null;
  function dailyEvent(id, val, isMax) {
    daily();
    if (data.daily.done || data.daily.id !== id) return;
    data.daily.prog = isMax ? Math.max(data.daily.prog, val) : data.daily.prog + val;
    const q = QUESTS.find(x => x.id === id);
    if (data.daily.prog >= q.n) {
      data.daily.done = true; data.bonusStars += REWARD;
      onDailyDone && onDailyDone(q.txt(q.n), REWARD);
    }
  }

  // ---- haftalık kupa ----
  function weekId() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const w1 = new Date(d.getFullYear(), 0, 4);
    const wk = 1 + Math.round(((d - w1) / 864e5 - 3 + (w1.getDay() + 6) % 7) / 7);
    return d.getFullYear() + '-H' + wk;
  }
  function weekly() {
    const id = weekId();
    if (data.weekly.id !== id) { data.weekly = { id, best: 0, plays: 0 }; persist(); }
    return data.weekly;
  }

  // ---- başarımlar ----
  const st = () => data.stats;
  const worldDone = (from, to) => { for (let i = from; i <= to; i++) if (!data.stars[i]) return false; return true; };
  const ACH = [
    { id: 'pop1', icon: '✨', name: 'İlk Patlama', desc: 'İlk mücevherini patlat', test: () => st().popped >= 1 },
    { id: 'pop100', icon: '💎', name: 'Yüzlük', desc: '100 mücevher patlat', test: () => st().popped >= 100 },
    { id: 'pop1000', icon: '💍', name: 'Bin Mücevher', desc: '1.000 mücevher patlat', test: () => st().popped >= 1000 },
    { id: 'pop5000', icon: '👑', name: 'Mücevher Ustası', desc: '5.000 mücevher patlat', test: () => st().popped >= 5000 },
    { id: 'combo3', icon: '🔗', name: 'Zincirleme', desc: '3x kombo yap', test: () => st().maxCombo >= 3 },
    { id: 'combo5', icon: '⚡', name: 'Kombo Kralı', desc: '5x kombo yap', test: () => st().maxCombo >= 5 },
    { id: 'gap1', icon: '🪡', name: 'İğne Deliği', desc: 'İlk boşluk atışını yap', test: () => st().gapShots >= 1 },
    { id: 'gap20', icon: '🏹', name: 'Keskin Nişancı', desc: '20 boşluk atışı yap', test: () => st().gapShots >= 20 },
    { id: 'pw10', icon: '🧪', name: 'Güç Toplayıcı', desc: '10 güçlendirici kullan', test: () => st().powers >= 10 },
    { id: 'shot10', icon: '💥', name: 'Büyük Atış', desc: 'Tek atışla 10 mücevher patlat', test: () => st().bestShot >= 10 },
    { id: 'shot20', icon: '🌋', name: 'Efsane Atış', desc: 'Tek atışla 20 mücevher patlat', test: () => st().bestShot >= 20 },
    { id: 'perfect', icon: '🎯', name: 'Kusursuz', desc: 'Bir bölümü hiç ıskalamadan bitir', test: () => st().perfect >= 1 },
    { id: 'last', icon: '😅', name: 'Son Saniye', desc: 'Son Şans\'tan sonra bölümü kazan', test: () => st().lastChanceWins >= 1 },
    { id: 'boss1', icon: '🦝', name: 'Hırsız Avcısı', desc: 'Rakun Rüstem\'i bir kez yen', test: () => st().bosses >= 1 },
    { id: 'boss6', icon: '🛡️', name: 'Rüstem\'in Kâbusu', desc: 'Rüstem\'i 6 kez yen', test: () => st().bosses >= 6 },
    { id: 'gold50', icon: '🪙', name: 'Altın Avcısı', desc: '50 altın top topla', test: () => st().gold >= 50 },
    { id: 'ice30', icon: '🧊', name: 'Buzkıran', desc: '30 buz kır', test: () => st().ice >= 30 },
    { id: 'joker10', icon: '🌈', name: 'Gökkuşağı', desc: '10 gökkuşağı mücevher patlat', test: () => st().joker >= 10 },
    { id: 'w1', icon: '🌷', name: 'Bahçıvan', desc: '1. dünyayı bitir', test: () => worldDone(0, 4) },
    { id: 'w3', icon: '🌙', name: 'Gece Bekçisi', desc: '3. dünyayı bitir', test: () => worldDone(10, 14) },
    { id: 'w6', icon: '🏰', name: 'Krallığın Kurtarıcısı', desc: 'Tüm bölümleri bitir', test: () => worldDone(0, 29) },
    { id: 'star45', icon: '⭐', name: 'Yıldız Koleksiyoncusu', desc: '45 yıldız topla', test: () => totalStars() >= 45 },
    { id: 'star90', icon: '🌟', name: 'Tam Puan', desc: '90 yıldızın hepsini topla', test: () => levelStars() >= 90 },
    { id: 'surv', icon: '♾️', name: 'Sonsuz Kahraman', desc: 'Sonsuz Mod\'da 5.000 puan yap', test: () => data.bestSurvival >= 5000 },
    { id: 'weekly', icon: '🏆', name: 'Kupa Avcısı', desc: 'Haftalık Kupa\'ya katıl', test: () => st().weeklyPlayed >= 1 },
    { id: 'style', icon: '🎨', name: 'Moda İkonu', desc: 'Yeni bir top görünümü seç', test: () => data.skin !== 'classic' || data.cannon !== 'royal' },
    { id: 'daily', icon: '☀️', name: 'Görev Adamı', desc: 'Bir günlük görevi tamamla', test: () => data.bonusStars >= REWARD },
    { id: 'time60', icon: '⏳', name: 'Sadık Oyuncu', desc: '60 dakika oyna', test: () => st().playTime >= 3600 }
  ];
  function checkAch() {
    ACH.forEach(a => {
      if (data.ach[a.id]) return;
      let ok = false; try { ok = a.test(); } catch (_) { }
      if (ok) { data.ach[a.id] = Date.now(); onAch && onAch(a); }
    });
  }

  // ---- olaylar ----
  function ev(type, v) {
    const s = data.stats;
    switch (type) {
      case 'pop': s.popped += v; dailyEvent('pop', v); break;
      case 'shot': s.shots++; break;
      case 'shotPops': s.bestShot = Math.max(s.bestShot, v || 0); break;
      case 'combo': s.maxCombo = Math.max(s.maxCombo, v); dailyEvent('combo', v, true); break;
      case 'gap': s.gapShots++; dailyEvent('gap', 1); break;
      case 'power': s.powers++; dailyEvent('power', 1); break;
      case 'ice': s.ice++; dailyEvent('ice', 1); break;
      case 'joker': s.joker += v; break;
      case 'gold': s.gold += v; dailyEvent('gold', v); break;
      case 'boss': s.bosses++; break;
      case 'lastChance': break;
      case 'win':
        s.wins++; dailyEvent('wins', 1);
        if (v.stars >= 3) dailyEvent('win3', 1);
        if (!v.misses) s.perfect++;
        if (v.lastChance) s.lastChanceWins++;
        break;
      case 'lose': s.losses++; break;
      case 'play': s.played++; break;
      case 'weekly': s.weeklyPlayed++; break;
      case 'time': s.playTime += v; break;
    }
    checkAch();
  }

  function levelStars() { let t = 0; for (const k in data.stars) if (+k < LEVELS.length) t += data.stars[k]; return t; }
  function totalStars() { return levelStars() + data.bonusStars; }

  // ---- dışa/içe aktarma ----
  function exportCode() {
    const json = JSON.stringify(data);
    return 'KZ1.' + btoa(unescape(encodeURIComponent(json)));
  }
  function importCode(code) {
    code = (code || '').trim();
    if (!code.startsWith('KZ1.')) throw new Error('kod');
    const d = JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));
    if (typeof d !== 'object' || !d.settings || !d.stats) throw new Error('içerik');
    data = normalize(d);
    persist();
  }

  window.Save = {
    get d() { return data; },
    persist, ev, daily, weekly, totalStars, levelStars, exportCode, importCode, checkAch, ACH, DEV,
    set onDailyDone(f) { onDailyDone = f; },
    set onAch(f) { onAch = f; },
    skinUnlocked(id) { const s = SKINS.find(x => x.id === id); return !!s && totalStars() >= s.stars; },
    cannonUnlocked(id) { const s = CANNONS.find(x => x.id === id); return !!s && totalStars() >= s.stars; }
  };
})();
