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
  S.vibrate = (ms) => { if (S.vib && navigator.vibrate) { try { navigator.vibrate(ms); } catch (_) { } } };

  // ---------- müzik: C - Am - F - G döngüsü, yumuşak masal havası ----------
  const BPM = 92, BEAT = 60 / BPM;
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  const CHORDS = [[48, 55, 60, 64, 67], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62]];
  const MELODY = [
    [76, 74, 72, 74, 76, 76, 76, -1], [72, 69, 72, 76, 74, 72, 69, -1],
    [72, 74, 76, 77, 76, 74, 72, -1], [74, 76, 74, 71, 67, 71, 74, -1],
    [76, 79, 76, 74, 72, 74, 76, -1], [72, 76, 81, 79, 76, 72, 69, -1],
    [77, 76, 74, 72, 69, 72, 74, -1], [74, 71, 67, 71, 74, 72, 71, -1]
  ];
  let musicTimer = null, nextBar = 0, barIdx = 0, musicStarted = false;
  function scheduleBar(t, bar) {
    const ch = CHORDS[bar % 4], mel = MELODY[bar % 8];
    // pad
    ch.slice(1).forEach(n => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = N(n);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + BEAT * 4);
      o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + BEAT * 4 + 0.05);
    });
    // bas
    [0, 2].forEach(b => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = N(ch[0] - 12);
      const tt = t + b * BEAT;
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.16, tt + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, tt + BEAT * 1.8);
      o.connect(g); g.connect(musicGain); o.start(tt); o.stop(tt + BEAT * 2);
    });
    // melodi (8'lik notalar, çan sesi)
    mel.forEach((n, i) => {
      if (n < 0) return;
      const tt = t + i * BEAT / 2;
      [1, 2.01].forEach((m, j) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = N(n) * m;
        g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(j ? 0.018 : 0.06, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + BEAT * 0.9);
        o.connect(g); g.connect(musicGain); o.start(tt); o.stop(tt + BEAT);
      });
    });
    // hafif tıkırtı
    for (let i = 0; i < 4; i++) noise(0.03, 0.025, (t - ctx.currentTime) + i * BEAT + BEAT / 2, 6000, musicGain);
  }
  function tick() {
    while (nextBar < ctx.currentTime + 1.5) { scheduleBar(nextBar, barIdx++); nextBar += BEAT * 4; }
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
  S.setMusic = (on) => { S.musicOn = on; if (on) startMusic(); else setMusicVol(); };
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  window.SFX = S;
})();
