// Kayıt: ilerleme, ayarlar, istatistikler, günlük görev, görünümler (localStorage)
(function () {
  const KEY = 'kraliyet_zinciri_v2';
  const DEF = {
    unlocked: 1, stars: {}, best: {}, bonusStars: 0, skin: 'classic',
    seenStory: {}, bestSurvival: 0,
    settings: { sound: true, music: true, vibrate: true, aim: true, colorblind: false, bigBalls: false, lowQuality: false, difficulty: 'normal' },
    stats: { popped: 0, shots: 0, maxCombo: 0, wins: 0, losses: 0, gapShots: 0, powers: 0, played: 0, playTime: 0 },
    daily: { date: '', id: '', prog: 0, done: false }
  };
  let data = JSON.parse(JSON.stringify(DEF));
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      data = Object.assign(data, d);
      data.settings = Object.assign({}, DEF.settings, d.settings || {});
      data.stats = Object.assign({}, DEF.stats, d.stats || {});
      data.daily = Object.assign({}, DEF.daily, d.daily || {});
    } else {
      // eski sürümden yükseltme
      const old = localStorage.getItem('kraliyet_zinciri_v1');
      if (old) { const o = JSON.parse(old); data.unlocked = o.unlocked || 1; data.stars = o.stars || {}; data.best = o.best || {}; data.settings.sound = o.sound !== false; }
    }
  } catch (_) { }
  if (/[?&]dev=1/.test(location.search)) data.unlocked = 99;

  function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { } }

  // ---- günlük görev ----
  const QUESTS = [
    { id: 'pop', txt: n => n + ' mücevher patlat', n: 150 },
    { id: 'combo', txt: n => n + 'x kombo yap', n: 3 },
    { id: 'power', txt: n => n + ' güçlendirici kullan', n: 3 },
    { id: 'gap', txt: n => n + ' boşluk atışı yap', n: 2 },
    { id: 'win3', txt: () => 'Bir bölümü 3 yıldızla bitir', n: 1 },
    { id: 'wins', txt: n => n + ' bölüm kazan', n: 2 }
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
  let onDailyDone = null;
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

  // ---- olaylar ----
  function ev(type, v) {
    const s = data.stats;
    switch (type) {
      case 'pop': s.popped += v; dailyEvent('pop', v); break;
      case 'shot': s.shots++; break;
      case 'combo': s.maxCombo = Math.max(s.maxCombo, v); dailyEvent('combo', v, true); break;
      case 'gap': s.gapShots++; dailyEvent('gap', 1); break;
      case 'power': s.powers++; dailyEvent('power', 1); break;
      case 'win': s.wins++; dailyEvent('wins', 1); if (v >= 3) dailyEvent('win3', 1); break;
      case 'lose': s.losses++; break;
      case 'play': s.played++; break;
      case 'time': s.playTime += v; break;
    }
  }

  function totalStars() {
    let t = data.bonusStars;
    for (const k in data.stars) t += data.stars[k];
    return t;
  }

  window.Save = {
    get d() { return data; },
    persist, ev, daily, totalStars,
    set onDailyDone(f) { onDailyDone = f; },
    skinUnlocked(id) { const s = SKINS.find(x => x.id === id); return s && totalStars() >= s.stars; }
  };
})();
