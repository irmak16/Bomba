// Sentez sesler ve kodla üretilen arka plan müziği (dosya gerektirmez).
(function () {
  let ctx = null, master = null, sfxGain = null, musicGain = null;
  const S = { enabled: true, musicOn: true };

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.7; sfxGain.connect(master);
      musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo, out) {
    if (!ensure()) return;
    if (!out && !S.enabled) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(dur, vol, when, hp, out) {
    if (!ensure()) return;
    if (!out && !S.enabled) return;
    const t = ctx.currentTime + (when || 0);
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out || sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1567.98, 1760, 2093];

  S.unlock = () => { ensure(); if (S.musicOn) startMusic(); };
  S.shoot = () => { tone(520, 0.12, 'sine', 0.25, 0, 180); noise(0.06, 0.08, 0, 2500); };
  S.insert = () => tone(1100, 0.05, 'triangle', 0.12);
  S.clack = () => { tone(240, 0.07, 'square', 0.07); noise(0.04, 0.1, 0, 800); };
  S.tink = () => { tone(1800, 0.12, 'triangle', 0.15); tone(2400, 0.08, 'sine', 0.08, 0.02); };
  S.pop = (combo) => {
    const base = Math.min(combo, 7);
    for (let i = 0; i < 3; i++) tone(PENTA[base + i], 0.22, 'triangle', 0.18, i * 0.045);
    noise(0.12, 0.06, 0, 3000);
  };
  S.combo = (n) => { const b = Math.min(n, 5); [0, 2, 4].forEach((k, i) => tone(PENTA[b + k] / 2, 0.45, 'sine', 0.16, i * 0.06)); };
  S.gap = () => { [0, 2, 4, 7].forEach((k, i) => tone(PENTA[k], 0.18, 'sine', 0.14, i * 0.04)); };
  S.power = () => { [0, 4, 7, 9].forEach((k, i) => tone(PENTA[k] * (i % 2 ? 1 : 0.5), 0.3, 'square', 0.06, i * 0.05)); tone(220, 0.5, 'sine', 0.2, 0, 880); };
  S.boom = () => { tone(160, 0.5, 'sine', 0.35, 0, 40); noise(0.4, 0.3, 0, 200); };
  S.swap = () => { tone(700, 0.06, 'sine', 0.15); tone(950, 0.06, 'sine', 0.12, 0.05); };
  S.button = () => tone(880, 0.07, 'sine', 0.15);
  S.warn = () => tone(220, 0.25, 'sine', 0.18, 0, 160);
  S.coin = () => tone(1568 + Math.random() * 400, 0.12, 'square', 0.04);
  S.win = () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, 'triangle', 0.2, i * 0.11)); };
  S.lose = () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.45, 'sawtooth', 0.08, i * 0.18)); };
  S.star = (i) => tone(PENTA[3 + i * 2], 0.3, 'triangle', 0.2);
  S.ice = () => { noise(0.18, 0.18, 0, 4000); [2400, 3100, 2800].forEach((f, i) => tone(f, 0.08, 'triangle', 0.07, i * 0.03)); };
  S.paint = () => { [0, 1, 2, 4, 6].forEach((k, i) => tone(PENTA[k + 2], 0.2, 'sine', 0.1, i * 0.035)); noise(0.3, 0.05, 0, 2000); };
  S.bossHit = () => { tone(130, 0.18, 'square', 0.1, 0, 70); noise(0.1, 0.12, 0, 600); };
  S.pull = () => { tone(300, 0.5, 'sawtooth', 0.07, 0, 120); tone(200, 0.5, 'sawtooth', 0.05, 0.1, 90); };
  S.lastChance = () => { tone(200, 0.6, 'sine', 0.25, 0, 900); [0, 4, 7].forEach((k, i) => tone(PENTA[k + 3], 0.4, 'triangle', 0.15, 0.25 + i * 0.07)); };
  S.thunder = () => { if (!S.enabled || !ensure()) return; noise(1.4, 0.18, 0, 40); tone(55, 1.2, 'sine', 0.2, 0, 35); };
  S.vibrate = (ms) => { if (S.vib && navigator.vibrate) { try { navigator.vibrate(ms); } catch (_) { } } };

  // ---------- müzik: dünya başına tema (kodla üretilir) ----------
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  // tema: tempo, akorlar (kök + üçlü), melodi ölçeği, karakter
  const THEMES = [
    { bpm: 92, root: 48, prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], scale: [0, 2, 4, 7, 9], wave: 'sine', bell: 0.06 },          // C majör, neşeli
    { bpm: 84, root: 53, prog: [[0, 4, 7], [2, 5, 9], [-5, -1, 2], [0, 4, 7]], scale: [0, 2, 4, 5, 7, 9], wave: 'triangle', bell: 0.05 },     // F majör, sıcak
    { bpm: 76, root: 45, prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], scale: [0, 2, 3, 7, 8], wave: 'sine', bell: 0.055 },          // La minör, gizemli
    { bpm: 88, root: 50, prog: [[0, 3, 7], [5, 9, 12], [-2, 2, 5], [0, 3, 7]], scale: [0, 2, 3, 5, 7, 9], wave: 'triangle', bell: 0.05 },      // Re dorian, sonbahar
    { bpm: 70, root: 52, prog: [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -2, 2]], scale: [0, 3, 7, 10, 12], wave: 'sine', bell: 0.07 },        // Mi minör, kış çanları
    { bpm: 104, root: 43, prog: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], scale: [0, 2, 3, 5, 7], wave: 'sawtooth', bell: 0.04 },      // Sol minör, fırtına
  ];
  THEMES.boss = { bpm: 116, root: 45, prog: [[0, 3, 7], [1, 4, 8], [0, 3, 7], [-1, 3, 6]], scale: [0, 1, 3, 5, 7], wave: 'square', bell: 0.035, drums: true };
  let theme = THEMES[0], themeKey = 0;
  let musicTimer = null, nextBar = 0, barIdx = 0, musicStarted = false, seed = 1;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let melodyCache = {};
  function melodyFor(bar) {
    const key = themeKey + ':' + (bar % 8);
    if (melodyCache[key]) return melodyCache[key];
    seed = 1000 + (bar % 8) * 97 + (typeof themeKey === 'number' ? themeKey * 13 : 77);
    const ch = theme.prog[bar % 4], notes = [];
    let last = 2;
    for (let i = 0; i < 8; i++) {
      if (i === 7 || rand() < 0.15) { notes.push(-1); continue; }
      // vuruşlarda akor notası, aralarda ölçek notası
      if (i % 2 === 0) notes.push(theme.root + 24 + ch[(rand() * 3) | 0]);
      else { last = Math.max(0, Math.min(theme.scale.length - 1, last + ((rand() * 3) | 0) - 1)); notes.push(theme.root + 24 + theme.scale[last]); }
    }
    return (melodyCache[key] = notes);
  }
  function scheduleBar(t, bar) {
    const BEAT = 60 / theme.bpm;
    const ch = theme.prog[bar % 4], mel = melodyFor(bar);
    ch.forEach(iv => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = N(theme.root + 12 + iv);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + BEAT * 4);
      o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + BEAT * 4 + 0.05);
    });
    const bassBeats = theme.drums ? [0, 1, 2, 3] : [0, 2];
    bassBeats.forEach(b => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = N(theme.root + ch[0] - 12);
      const tt = t + b * BEAT;
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.16, tt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, tt + BEAT * 1.6);
      o.connect(g); g.connect(musicGain); o.start(tt); o.stop(tt + BEAT * 2);
    });
    mel.forEach((n, i) => {
      if (n < 0) return;
      const tt = t + i * BEAT / 2;
      [1, 2.01].forEach((m, j) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = j ? 'sine' : theme.wave; o.frequency.value = N(n) * m;
        const v = j ? theme.bell * 0.3 : theme.bell * (theme.wave === 'sine' ? 1 : 0.45);
        g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(v, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + BEAT * 0.9);
        o.connect(g); g.connect(musicGain); o.start(tt); o.stop(tt + BEAT);
      });
    });
    for (let i = 0; i < 4; i++) noise(0.03, theme.drums ? 0.05 : 0.025, (t - ctx.currentTime) + i * BEAT + BEAT / 2, 6000, musicGain);
    if (theme.drums) for (let i = 0; i < 4; i += 2) { const o = ctx.createOscillator(), g = ctx.createGain(); const tt = t + i * BEAT; o.frequency.setValueAtTime(140, tt); o.frequency.exponentialRampToValueAtTime(45, tt + 0.15); g.gain.setValueAtTime(0.25, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.2); o.connect(g); g.connect(musicGain); o.start(tt); o.stop(tt + 0.22); }
  }
  function tick() {
    while (nextBar < ctx.currentTime + 1.5) { scheduleBar(nextBar, barIdx++); nextBar += 60 / theme.bpm * 4; }
  }
  function startMusic() {
    if (!ensure() || musicStarted) { setMusicVol(); return; }
    musicStarted = true;
    nextBar = ctx.currentTime + 0.1;
    tick(); musicTimer = setInterval(tick, 400);
    setMusicVol();
  }
  function setMusicVol() {
    if (!ctx) return;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(S.musicOn ? 0.55 : 0, ctx.currentTime, 0.3);
  }
  S.setTheme = (k) => {
    const t = THEMES[k] || THEMES[0];
    if (t === theme) return;
    theme = t; themeKey = k; barIdx = 0;
    if (ctx && musicStarted) nextBar = Math.max(nextBar, ctx.currentTime + 0.05);
  };
  S.setMusic = (on) => { S.musicOn = on; if (on) startMusic(); else setMusicVol(); };
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  window.SFX = S;
})();
