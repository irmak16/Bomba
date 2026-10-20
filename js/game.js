// Kraliyet Zinciri - oyun çekirdeği
(function () {
  'use strict';

  const W = 1600, H = 893;
  let D = 46, R = 23;
  const SHOT_SPEED = 1550, RUSH_SPEED = 430, INSERT_TIME = 0.13;
  const VIEW = { x0: 300, y0: 122, x1: 1300, y1: 790 };
  const WCX = (VIEW.x0 + VIEW.x1) / 2, WCY = (VIEW.y0 + VIEW.y1) / 2;
  const JOKER = '*';
  const set = () => Save.d.settings;
  const hexOf = c => BALL_HEX[c] || '#ffffff';

  // ---------- görseller ----------
  const IMG = { balls: {}, em: {}, cannons: {} };
  const BG_IDS = Object.keys(BGS);
  function loadImages(done) {
    const jobs = [];
    const add = (obj, key, src) => jobs.push([obj, key, src]);
    add(IMG, 'chest', 'assets/img/chest.webp');
    add(IMG, 'pillar', 'assets/img/pillar.webp');
    add(IMG, 'raccoon', 'assets/img/raccoon.webp');
    add(IMG, 'joker', 'assets/img/balls/joker.webp');
    BG_IDS.forEach(b => add(IMG, b, 'assets/img/' + b + '.webp'));
    CANNONS.forEach(c => add(IMG.cannons, c.id, 'assets/img/' + c.file + '.webp'));
    SKINS.forEach(s => { IMG.balls[s.id] = {}; BALL_COLORS.forEach(c => add(IMG.balls[s.id], c, 'assets/img/balls/' + s.id + '_' + c + '.webp')); });
    BALL_COLORS.forEach(c => add(IMG.em, c, 'assets/img/balls/emblem_' + c + '.webp'));
    let left = jobs.length;
    jobs.forEach(([o, k, src]) => {
      const im = new Image();
      im.onload = im.onerror = () => { if (--left === 0) done(); };
      im.src = src; o[k] = im;
    });
  }

  // ---------- durum ----------
  const G = {
    mode: 'loading', level: null, levelIdx: 0, kind: 'level',
    chains: [], shots: [], parts: [], texts: [], pops: [], flashes: [], obst: [], wx: [],
    colors: [], total: 0, destroyed: 0, score: 0, combo: 0, streak: 0, maxProg: 0,
    speedBase: 30, eff: { slow: 0, back: 0, aim: 0, pull: 0 },
    shooter: { x: 800, y: 480, ang: -Math.PI / 2, cur: 'red', next: 'blue', recoil: 0, swapT: 0 },
    aim: { show: false }, shake: 0, time: 0, bigText: null, hintT: 0, sparkT: 0, flash: 0,
    goal: { type: 'clear' }, gold: 0, survT: 0, boss: null, lastChance: false, misses: 0, shotPops: 0,
    surv: { t: 0, lvl: 1 }, playTime: 0, runId: 0,
    cb: {}
  };

  // ---------- kamera ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const cam = { k: 1, rot: 0, cx: 0, cy: 0, dpr: 1, sw: 0, sh: 0 };
  let layer = null, overlay = null, layerKey = '';

  function resize() {
    const dpr = set().lowQuality ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const sw = window.innerWidth, sh = window.innerHeight;
    canvas.width = Math.round(sw * dpr); canvas.height = Math.round(sh * dpr);
    canvas.style.width = sw + 'px'; canvas.style.height = sh + 'px';
    cam.dpr = dpr; cam.sw = sw; cam.sh = sh;
    const vw = VIEW.x1 - VIEW.x0, vh = VIEW.y1 - VIEW.y0;
    const portrait = sh > sw * 1.05;
    const playing = !(G.mode === 'demo' || G.mode === 'loading');
    const u = portrait ? Math.min(sw * 0.016, sh * 0.01, 11) : Math.min(sw * 0.01, sh * 0.016, 11);
    const hud = playing ? Math.max(48, u * 8.4) : 0;
    if (portrait) { cam.rot = Math.PI / 2; cam.k = Math.min((sh - hud) / vw, sw / vh); }
    else { cam.rot = 0; cam.k = Math.min(sw / vw, (sh - hud) / vh); }
    cam.cx = sw / 2; cam.cy = hud + (sh - hud) / 2;
    document.body.classList.toggle('portrait', portrait);
    layerKey = '';
  }
  function worldMatrix(ox, oy) {
    const s = cam.k * cam.dpr, c = Math.cos(cam.rot), n = Math.sin(cam.rot);
    const a = s * c, b = s * n, cc = -s * n, d = s * c;
    return [a, b, cc, d,
      cam.dpr * (cam.cx + (ox || 0)) - (a * WCX + cc * WCY),
      cam.dpr * (cam.cy + (oy || 0)) - (b * WCX + d * WCY)];
  }
  function setWorldTransform(ox, oy) { ctx.setTransform.apply(ctx, worldMatrix(ox, oy)); }
  function toWorld(sx, sy) {
    const dx = (sx - cam.cx) / cam.k, dy = (sy - cam.cy) / cam.k;
    const c = Math.cos(-cam.rot), n = Math.sin(-cam.rot);
    return { x: WCX + dx * c - dy * n, y: WCY + dx * n + dy * c };
  }
  function toScreen(x, y) {
    const dx = (x - WCX) * cam.k, dy = (y - WCY) * cam.k;
    const c = Math.cos(cam.rot), n = Math.sin(cam.rot);
    return { x: cam.cx + dx * c - dy * n, y: cam.cy + dx * n + dy * c };
  }

  // ---------- statik katmanlar ----------
  // Arka plan + yol, ekran çözünürlüğünde ve dönüşü uygulanmış olarak bir kez çizilir;
  // her karede yalnızca düz kopyalanır (telefonlarda çok daha hızlı).
  function buildLayers() {
    const key = G.runId + ':' + canvas.width + 'x' + canvas.height + ':' + cam.rot + ':' + cam.k.toFixed(4) + ':' + cam.cx + ',' + cam.cy + ':' + D;
    if (key === layerKey) return;
    layerKey = key;
    const mk = () => { const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height; return c; };
    layer = mk(); overlay = mk();
    const c = layer.getContext('2d');
    c.fillStyle = '#c4573b'; c.fillRect(0, 0, layer.width, layer.height);
    c.setTransform.apply(c, worldMatrix(0, 0));
    c.drawImage(IMG[G.level.bg] || IMG.bg1, 0, 0, W, H);
    const night = !!(BGS[G.level.bg] || {}).night;
    G.chains.forEach(ch => KZPath.drawTrack(c, ch.path, { night, D, hidden: ch.hidden }));
    const o = overlay.getContext('2d');
    o.setTransform.apply(o, worldMatrix(0, 0));
    G.chains.forEach(ch => ch.tunnels.forEach(t => KZPath.drawBridge(o, ch.path, t[0], t[1], { D })));
    G.obst.filter(ob => ob.static).forEach(ob => drawPillar(o, ob.x, ob.y, ob.r, 1));
    overlayEmpty = !G.obst.some(ob => ob.static) && !G.chains.some(ch => ch.tunnels.length);
  }
  let overlayEmpty = true;
  function drawPillar(c, x, y, r, alpha) {
    c.save(); c.globalAlpha = alpha;
    c.fillStyle = 'rgba(30,20,5,0.35)';
    c.beginPath(); c.ellipse(x + 5, y + 9, r + 4, r, 0, 0, Math.PI * 2); c.fill();
    c.drawImage(IMG.pillar, x - r - 6, y - r - 6, (r + 6) * 2, (r + 6) * 2);
    c.restore();
  }

  // ---------- yardımcılar ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const ease = t => 1 - Math.pow(1 - t, 3);
  const headS = sg => sg.balls[sg.balls.length - 1].s;
  const allBalls = function* () { for (const ch of G.chains) for (const sg of ch.segs) for (const b of sg.balls) yield [ch, b]; };
  const inRanges = (rs, s, pad) => { for (const t of rs) if (s >= t[0] - pad && s <= t[1] + pad) return true; return false; };
  const covered = (ch, s) => inRanges(ch.tunnels, s, R * 0.4) || inRanges(ch.hidden, s, R * 0.6);
  const partMul = () => set().lowQuality ? 0.4 : 1;
  const compat = (a, b) => !a.ice && !b.ice && (a.c === b.c || a.c === JOKER || b.c === JOKER);

  function presentColors() {
    const st = new Set();
    for (const [, b] of allBalls()) if (b.c !== JOKER) st.add(b.c);
    return st.size ? Array.from(st) : G.colors;
  }
  function countSpecial(f) { let n = 0; for (const [, b] of allBalls()) if (f(b)) n++; return n; }
  const endless = () => G.level.survival || G.goal.type !== 'clear' || G.mode === 'demo';

  function newBall(ch) {
    let c;
    if (ch.lastC && ch.runLen < 2 && Math.random() < 0.42) c = ch.lastC;
    else c = pick(G.colors);
    if (c === ch.lastC) ch.runLen++; else { ch.runLen = 1; ch.lastC = c; }
    if (ch.runLen > 3) { c = pick(G.colors.filter(x => x !== ch.lastC)); ch.lastC = c; ch.runLen = 1; }
    const b = { c, g: 1, s: 0, x: 0, y: 0, pw: null, kind: null, ice: false };
    if (G.mode !== 'play') return b;
    const sp = G.level.special || {};
    const r = Math.random();
    if (G.level.pw && r < G.level.pw && countSpecial(x => x.pw) < 2) b.pw = pick(Object.keys(POWERS));
    else if (sp.joker && Math.random() < sp.joker && countSpecial(x => x.c === JOKER) < 2) { b.c = JOKER; b.kind = 'joker'; }
    else if (sp.ice && Math.random() < sp.ice) { b.kind = 'ice'; b.ice = true; }
    else if (sp.gold && Math.random() < sp.gold && countSpecial(x => x.kind === 'gold') < 3) b.kind = 'gold';
    return b;
  }

  function layout(ch) {
    for (const sg of ch.segs) {
      let s = sg.s0;
      const b = sg.balls;
      for (let k = 0; k < b.length; k++) {
        if (k > 0) s += D * (b[k - 1].g + b[k].g) / 2;
        const ball = b[k];
        ball.s = s;
        ch.path.pos(s, ball);
        if (ball.ins) {
          const e = ease(ball.g);
          ball.x = ball.ins.x + (ball.x - ball.ins.x) * e;
          ball.y = ball.ins.y + (ball.y - ball.ins.y) * e;
        }
      }
    }
  }

  // ---------- bölüm kurulumu ----------
  function setup(level, idx, mode, kind) {
    const st = set();
    D = st.bigBalls ? 54 : 46; R = D / 2;
    G.level = level; G.levelIdx = idx; G.kind = kind || 'level';
    G.runId++;
    G.mode = mode;
    G.goal = Object.assign({ type: 'clear' }, level.goal || {});
    if (level.survival) G.goal = { type: 'clear' };
    const diff = st.difficulty;
    const speedMul = diff === 'easy' ? 0.78 : diff === 'hard' ? 1.2 : 1;
    const nColors = Math.max(3, Math.min(6, level.colors + (diff === 'easy' ? -1 : 0)));
    G.colors = BALL_COLORS.slice(0, nColors);
    const count = endless() ? Infinity : Math.round(level.count * (diff === 'hard' ? 1.15 : diff === 'easy' ? 0.85 : 1));
    G.chains = level.paths.map((pts, pi) => {
      const path = KZPath.buildPath(pts);
      const tunnels = [];
      (level.tunnels || []).forEach(b => tunnels.push(...path.rangesInBox(b)));
      const hidden = (level.portals || []).filter(p => p[0] === pi).map(p => [path.ctrlS[p[1]], path.ctrlS[p[2]]]);
      return { path, segs: [], toSpawn: count, tunnels, hidden, lastC: null, runLen: 0, speed: RUSH_SPEED, end: path.pos(path.len, {}), bounce: 0, warnT: 0 };
    });
    G.obst = (level.obstacles || []).map(o => Array.isArray(o)
      ? { x: o[0], y: o[1], r: 30, static: true, on: 1 }
      : Object.assign({ r: 30, static: false, on: 1, t: 0 }, o));
    G.total = count * G.chains.length;
    G.speedBase = level.speed * speedMul;
    G.shots = []; G.parts = []; G.texts = []; G.pops = []; G.flashes = []; G.wx = [];
    G.destroyed = 0; G.score = 0; G.combo = 0; G.streak = 0; G.maxProg = 0;
    G.eff = { slow: 0, back: 0, aim: 0, pull: 0 };
    G.shake = 0; G.bigText = null; G.endT = 0; G.surv = { t: 0, lvl: 1 }; G.playTime = 0; G.flash = 0;
    G.gold = 0; G.survT = 0; G.lastChance = false; G.misses = 0; G.shotPops = 0;
    G.bossAt = null;
    G.boss = G.goal.type === 'boss' ? { hp: G.goal.hp, max: G.goal.hp, hitT: 0, pullT: 9, dead: false } : null;
    G.shooter.x = level.shooter[0]; G.shooter.y = level.shooter[1];
    G.shooter.ang = -Math.PI / 2;
    G.shooter.cur = pick(G.colors); G.shooter.next = pick(G.colors);
    SFX.vib = st.vibrate;
    const theme = level.theme !== undefined ? level.theme : (window.WORLDS || []).findIndex(w => idx >= w.from && idx <= w.to);
    SFX.setTheme(G.boss && mode === 'play' ? 'boss' : Math.max(0, theme));
    if (mode === 'play' && G.goal.type !== 'clear') G.bigText = { txt: 'Hedef: ' + GOAL_TEXT[G.goal.type](G.goal), t: -0.4, col: '#9ff3ff' };
    resize();
    hudUpdate();
  }

  // ---------- top silme ----------
  function removeBalls(ch, rm) {
    const out = [];
    for (const sg of ch.segs) {
      let cur = null;
      for (let k = 0; k < sg.balls.length; k++) {
        const b = sg.balls[k];
        if (rm.has(b)) {
          // yanındaki buzları çöz
          [sg.balls[k - 1], sg.balls[k + 1]].forEach(nb => { if (nb && nb.ice && !rm.has(nb)) thaw(nb); });
          cur = null; continue;
        }
        if (!cur) { cur = { s0: k === 0 ? sg.s0 : b.s, balls: [], v: k === 0 ? sg.v : 0 }; out.push(cur); }
        cur.balls.push(b);
      }
    }
    ch.segs = out;
  }
  function thaw(b) {
    b.ice = false;
    SFX.ice();
    for (let i = 0; i < Math.round(8 * partMul()); i++) {
      const a = rnd(0, Math.PI * 2), sp = rnd(80, 260);
      G.parts.push({ type: 'shard', x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rnd(0.4, 0.7), r: rnd(3, 6), spin: rnd(0, 6) });
    }
    Save.ev('ice');
  }

  // ---------- eşleşme ----------
  function runAt(b, idx, col) {
    let a = idx, e = idx;
    const ok = x => x && x.g >= 1 && !x.ice && (x.c === col || x.c === JOKER);
    while (ok(b[a - 1])) a--;
    while (ok(b[e + 1])) e++;
    return [a, e];
  }
  function checkMatch(ch, segIdx, idx, chained) {
    const sg = ch.segs[segIdx];
    if (!sg) return false;
    const b = sg.balls;
    if (!b[idx] || b[idx].g < 1 || b[idx].ice) return false;
    let a, e;
    if (b[idx].c === JOKER) {
      // joker: iki komşu rengin hangisi daha uzun dizi yaparsa
      let best = [idx, idx];
      [b[idx - 1], b[idx + 1]].forEach(nb => {
        if (!nb || nb.c === JOKER || nb.ice) return;
        const r = runAt(b, idx, nb.c);
        if (r[1] - r[0] > best[1] - best[0]) best = r;
      });
      [a, e] = best;
    } else[a, e] = runAt(b, idx, b[idx].c);
    const n = e - a + 1;
    if (n < 3) return false;
    const runCol = b.slice(a, e + 1).find(x => x.c !== JOKER);
    const c = runCol ? runCol.c : 'yellow';

    G.combo = chained ? G.combo + 1 : 1;
    const run = b.slice(a, e + 1);
    const byChain = new Map([[ch, new Set(run)]]);
    const powers = run.filter(x => x.pw).map(x => ({ pw: x.pw, x: x.x, y: x.y, c }));
    powers.filter(p => p.pw === 'bomb').forEach(p => {
      for (const [c2, bb] of allBalls()) {
        if (Math.hypot(bb.x - p.x, bb.y - p.y) < 125 && bb.s > 0 && !covered(c2, bb.s)) {
          if (!byChain.has(c2)) byChain.set(c2, new Set());
          byChain.get(c2).add(bb);
        }
      }
    });
    let total = 0, mx = 0, my = 0, golds = 0, jokers = 0;
    byChain.forEach((rm, c2) => {
      rm.forEach(r => {
        total++; mx += r.x; my += r.y;
        if (r.kind === 'gold') { golds++; coinBurst(r.x, r.y, 6); }
        if (r.c === JOKER) jokers++;
        G.pops.push({ x: r.x, y: r.y, c: r.c, t: 0 });
        burst(r.x, r.y, hexOf(r.c), Math.round(9 * partMul()));
      });
      removeBalls(c2, rm);
      layout(c2);
    });
    mx /= total; my /= total;
    const pts = total * 10 * G.combo + (G.streak >= 2 ? G.streak * 5 : 0) + golds * 50;
    G.score += pts; G.destroyed += total; G.shotPops += total;
    Save.ev('pop', total);
    if (jokers) Save.ev('joker', jokers);
    if (golds) { G.gold += golds; Save.ev('gold', golds); SFX.coin(); setTimeout(() => SFX.coin(), 90); }
    G.texts.push({ x: mx, y: my - 10, txt: '+' + pts, t: 0 });
    ring(mx, my, hexOf(c));
    G.flashes.push({ x: mx, y: my, r: 60 + 30 * G.combo + n * 6, t: 0, life: 0.35, col: hexOf(c) });
    SFX.pop(G.combo + Math.min(G.streak, 3));
    SFX.vibrate(15);
    if (G.boss && !G.boss.dead) hitBoss(total * G.combo);
    if (G.combo >= 2) {
      Save.ev('combo', G.combo);
      G.bigText = { txt: 'KOMBO x' + G.combo, t: 0, col: '#ffd43a' };
      G.shake = Math.min(14, 4 + G.combo * 3);
      SFX.combo(G.combo); SFX.vibrate(35);
    } else if (n >= 5) {
      G.bigText = { txt: pick(['Harika!', 'Muhteşem!', 'Süper!']), t: 0, col: '#7dff8a' };
      G.shake = 5;
    }
    powers.forEach(p => activatePower(p));
    hudUpdate();
    return true;
  }

  function activatePower(p) {
    Save.ev('power');
    const P = POWERS[p.pw];
    G.bigText = { txt: P.icon + ' ' + P.name + '!', t: 0, col: '#9ff3ff' };
    if (p.pw === 'bomb') {
      SFX.boom(); SFX.vibrate(60);
      G.shake = 16;
      G.flashes.push({ x: p.x, y: p.y, r: 220, t: 0, life: 0.5, col: '#ffcf6a' });
      ring(p.x, p.y, '#ffb03a'); ring(p.x, p.y, '#ffffff');
      burst(p.x, p.y, '#ffb03a', Math.round(30 * partMul()));
    } else if (p.pw === 'paint') {
      SFX.paint();
      let n = 0;
      for (const [ch, b] of allBalls()) {
        if (b.s > 0 && b.c !== JOKER && !covered(ch, b.s) && Math.hypot(b.x - p.x, b.y - p.y) < 150) {
          b.c = p.c; n++;
          burst(b.x, b.y, hexOf(p.c), 3);
        }
      }
      G.flashes.push({ x: p.x, y: p.y, r: 170, t: 0, life: 0.5, col: hexOf(p.c) });
    } else {
      SFX.power();
      G.eff[p.pw] = P.time;
      if (p.pw === 'back') G.chains.forEach(ch => ch.speed = Math.min(ch.speed, 0));
    }
  }

  // ---------- patron ----------
  // patronu sandığın yanında, yola ve atıcıya en uzak boş noktaya yerleştir
  function bossPos() {
    if (G.bossAt) return G.bossAt;
    const e = G.chains[0].end;
    let best = { x: e.x + 100, y: e.y }, bestD = -1;
    for (let a = 0; a < 16; a++) {
      for (const rad of [100, 130]) {
        const x = e.x + Math.cos(a / 16 * 6.283) * rad, y = e.y + Math.sin(a / 16 * 6.283) * rad * 0.8;
        if (x < VIEW.x0 + 60 || x > VIEW.x1 - 60 || y < VIEW.y0 + 80 || y > VIEW.y1 - 40) continue;
        let d = Math.hypot(x - G.shooter.x, y - G.shooter.y) - 40;
        // sprite noktanın üstüne doğru uzandığı için iki noktayı kontrol et
        for (const ch of G.chains) for (let i = 0; i < ch.path.xs.length; i += 6) d = Math.min(d, Math.hypot(ch.path.xs[i] - x, ch.path.ys[i] - y), Math.hypot(ch.path.xs[i] - x, ch.path.ys[i] - (y - 40)));
        for (const ob of G.obst) d = Math.min(d, Math.hypot(ob.x - x, ob.y - y) - 20);
        if (d > bestD) { bestD = d; best = { x, y }; }
      }
    }
    return (G.bossAt = best);
  }
  function hitBoss(dmg) {
    const B = G.boss;
    B.hp = Math.max(0, B.hp - dmg); B.hitT = 0.35;
    SFX.bossHit();
    const p = bossPos();
    G.texts.push({ x: p.x, y: p.y - 80, txt: '-' + dmg, t: 0, col: '#ff8a7a' });
    if (B.hp <= 0) {
      B.dead = true;
      G.bigText = { txt: 'Rüstem kaçtı!', t: 0, col: '#ffd43a' };
      coinBurst(p.x, p.y - 30, 30); burst(p.x, p.y, '#cfd3e0', 30);
      Save.ev('boss');
    }
  }

  // ---------- efektler ----------
  function burst(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), sp = rnd(120, 420);
      G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rnd(0.35, 0.7), r: rnd(3, 7), col, star: Math.random() < 0.35 });
    }
  }
  function ring(x, y, col) { G.parts.push({ type: 'ring', x, y, t: 0, life: 0.4, col }); }
  function coinRain(n) {
    for (let i = 0; i < n; i++) G.parts.push({ type: 'coin', x: rnd(VIEW.x0, VIEW.x1), y: rnd(VIEW.y0 - 400, VIEW.y0 - 20), vx: rnd(-30, 30), vy: rnd(100, 300), t: 0, life: rnd(2.5, 3.5), r: rnd(9, 14), spin: rnd(0, 6), g: 500 });
  }
  function confetti(n) {
    const cols = ['#ff3b52', '#3d8bff', '#36d65a', '#ffd43a', '#b45cff', '#2fe0f0', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const left = Math.random() < 0.5;
      G.parts.push({ type: 'conf', x: left ? VIEW.x0 : VIEW.x1, y: VIEW.y1 - 50, vx: (left ? 1 : -1) * rnd(250, 700), vy: rnd(-900, -500), t: 0, life: rnd(2.2, 3.2), r: rnd(5, 9), spin: rnd(0, 6), col: pick(cols), g: 700 });
    }
  }
  function coinBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd(-Math.PI, 0), sp = rnd(200, 520);
      G.parts.push({ type: 'coin', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rnd(1, 1.6), r: rnd(7, 11), spin: rnd(0, 6), g: 900 });
    }
  }

  // ---------- hava efektleri ----------
  function weatherType() { return (BGS[G.level.bg] || {}).weather; }
  function updateWeather(dt) {
    const type = weatherType();
    if (!type) return;
    const max = Math.round({ pollen: 26, embers: 30, fireflies: 34, leaves: 30, snow: 110, rain: 140 }[type] * (set().lowQuality ? 0.35 : 1));
    while (G.wx.length < max) {
      const p = { x: rnd(VIEW.x0 - 100, VIEW.x1 + 100), y: rnd(VIEW.y0 - 60, VIEW.y1), t: rnd(0, 10), ph: rnd(0, 6.28) };
      if (type === 'snow') { p.vx = rnd(-15, 15); p.vy = rnd(40, 90); p.r = rnd(2, 4.5); }
      else if (type === 'rain') { p.vx = -140; p.vy = rnd(900, 1200); p.r = rnd(14, 26); }
      else if (type === 'leaves') { p.vx = rnd(20, 60); p.vy = rnd(30, 60); p.r = rnd(6, 10); p.spin = rnd(0, 6); p.col = pick(['#e8792a', '#d9552b', '#f2b33c', '#b8471f']); }
      else if (type === 'fireflies') { p.vx = rnd(-12, 12); p.vy = rnd(-12, 12); p.r = rnd(2, 3.5); }
      else if (type === 'embers') { p.vx = rnd(-8, 8); p.vy = rnd(-30, -12); p.r = rnd(1.5, 3); }
      else { p.vx = rnd(-10, 10); p.vy = rnd(-8, 8); p.r = rnd(1.5, 3); }
      G.wx.push(p);
    }
    for (const p of G.wx) {
      p.t += dt;
      if (type === 'leaves') { p.x += (p.vx + Math.sin(p.t * 1.7 + p.ph) * 40) * dt; p.y += p.vy * dt; p.spin += dt * 2; }
      else if (type === 'fireflies' || type === 'pollen') { p.x += (p.vx + Math.sin(p.t + p.ph) * 10) * dt; p.y += (p.vy + Math.cos(p.t * 0.8 + p.ph) * 10) * dt; }
      else { p.x += p.vx * dt; p.y += p.vy * dt; }
      if (p.y > VIEW.y1 + 40 || p.y < VIEW.y0 - 80 || p.x < VIEW.x0 - 140 || p.x > VIEW.x1 + 140) {
        p.x = rnd(VIEW.x0 - 100, VIEW.x1 + 100);
        p.y = (type === 'embers') ? VIEW.y1 + 20 : (type === 'fireflies' || type === 'pollen') ? rnd(VIEW.y0, VIEW.y1) : VIEW.y0 - rnd(10, 60);
      }
    }
    if (type === 'rain') {
      G.flash = Math.max(0, G.flash - dt * 2.5);
      if (Math.random() < dt * 0.08 && !set().lowQuality) { G.flash = 1; setTimeout(() => SFX.thunder(), 300); }
    }
  }
  function drawWeather() {
    const type = weatherType();
    if (!type || !G.wx.length) return;
    ctx.save();
    if (type === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (const p of G.wx) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); } }
    else if (type === 'rain') {
      ctx.strokeStyle = 'rgba(200,220,255,0.45)'; ctx.lineWidth = 2; ctx.beginPath();
      for (const p of G.wx) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.02, p.y - p.r); }
      ctx.stroke();
    } else if (type === 'leaves') {
      for (const p of G.wx) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ctx.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(p.spin)));
        ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.globalCompositeOperation = 'lighter';
      const col = type === 'fireflies' ? [255, 240, 140] : type === 'embers' ? [255, 170, 80] : [255, 255, 220];
      for (const p of G.wx) {
        const a = type === 'fireflies' ? 0.35 + 0.65 * Math.max(0, Math.sin(p.t * 2 + p.ph)) : 0.6;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- atış ----------
  function muzzle(dist) {
    const s = G.shooter;
    return { x: s.x + Math.cos(s.ang) * dist, y: s.y + Math.sin(s.ang) * dist };
  }
  function shoot() {
    if (G.mode !== 'play' || G.shots.length >= 2) return;
    const s = G.shooter, m = muzzle(70);
    const sp = SHOT_SPEED * (G.eff.aim > 0 ? 1.4 : 1);
    Save.ev('shotPops', G.shotPops); G.shotPops = 0;
    G.shots.push({ x: m.x, y: m.y, vx: Math.cos(s.ang) * sp, vy: Math.sin(s.ang) * sp, c: s.cur, gapSeen: new Set() });
    s.cur = s.next; s.next = pick(presentColors());
    s.recoil = 1;
    SFX.shoot(); Save.ev('shot');
  }
  function swap() {
    if (G.mode !== 'play') return;
    const s = G.shooter, t = s.cur; s.cur = s.next; s.next = t;
    s.swapT = 1; SFX.swap();
  }
  function insertShot(shot, ch, segIdx, k) {
    const sg = ch.segs[segIdx], hb = sg.balls[k];
    if (hb.ice && hb.g >= 1) {
      // buzlu topa çarpınca buz kırılır, atış harcanır
      thaw(hb);
      G.flashes.push({ x: hb.x, y: hb.y, r: 60, t: 0, life: 0.3, col: '#bfefff' });
      // buz kırılınca kendi rengiyle eşleşme olabilir
      setTimeout(() => {
        for (let i = 0; i < ch.segs.length; i++) { const kk = ch.segs[i].balls.indexOf(hb); if (kk >= 0) { checkMatch(ch, i, kk, false); break; } }
      }, 0);
      return;
    }
    const a = ch.path.angle(hb.s);
    const dot = (shot.x - hb.x) * Math.cos(a) + (shot.y - hb.y) * Math.sin(a);
    const idx = dot > 0 ? k + 1 : k;
    const nb = { c: shot.c, g: 0, ins: { x: shot.x, y: shot.y }, s: 0, x: shot.x, y: shot.y, shot: true, gaps: shot.gapSeen.size, pw: null, kind: null, ice: false };
    if (idx === 0) sg.s0 -= D / 2;
    sg.balls.splice(idx, 0, nb);
    SFX.insert();
  }
  function checkGaps(sh) {
    for (const ch of G.chains) {
      for (let i = 1; i < ch.segs.length; i++) {
        const key = ch.segs[i].balls[0];
        if (sh.gapSeen.has(key)) continue;
        const a = headS(ch.segs[i - 1]) + D * 0.55, b = key.s - D * 0.55;
        if (b - a < D * 0.3) continue;
        const tmp = {};
        for (let s = a; s <= b; s += 8) {
          if (covered(ch, s)) continue;
          ch.path.pos(s, tmp);
          const dx = tmp.x - sh.x, dy = tmp.y - sh.y;
          if (dx * dx + dy * dy < R * R * 0.8) { sh.gapSeen.add(key); break; }
        }
      }
    }
  }
  function updateObstacles(dt) {
    for (const ob of G.obst) {
      if (ob.static) continue;
      ob.t += dt;
      if (ob.orbit) { const [cx, cy, r, sp] = ob.orbit; ob.x = cx + Math.cos(ob.t * sp) * r; ob.y = cy + Math.sin(ob.t * sp) * r; }
      if (ob.blink) {
        const [on, off, ph] = ob.blink, per = on + off, tt = (ob.t + (ph || 0)) % per;
        const target = tt < on ? 1 : 0;
        ob.on += (target - ob.on) * Math.min(1, dt * 8);
      }
    }
  }
  const obstActive = ob => ob.on > 0.5;

  // ---------- güncelleme ----------
  function update(dt) {
    G.time += dt;
    const S = G.shooter;
    S.recoil = Math.max(0, S.recoil - dt * 6);
    S.swapT = Math.max(0, S.swapT - dt * 5);
    if (G.mode === 'demo') S.ang += Math.sin(G.time * 0.6) * dt * 0.8;
    updateWeather(dt);
    updateObstacles(dt);
    if (G.boss) G.boss.hitT = Math.max(0, G.boss.hitT - dt);
    if (G.mode === 'paused' || G.mode === 'won' || G.mode === 'lost' || G.mode === 'loading') { updateFx(dt); return; }

    if (G.mode === 'play') {
      G.playTime += dt;
      for (const k in G.eff) G.eff[k] = Math.max(0, G.eff[k] - dt);
      if (G.level.survival) {
        G.surv.t += dt;
        if (G.surv.t > 20) {
          G.surv.t = 0; G.surv.lvl++;
          G.speedBase += 3;
          if (G.colors.length < 6 && G.surv.lvl % 2 === 0) G.colors = BALL_COLORS.slice(0, G.colors.length + 1);
          G.bigText = { txt: 'Seviye ' + G.surv.lvl + '!', t: 0, col: '#ff9a6a' };
        }
      }
      if (G.goal.type === 'survive') { G.survT += dt; G.speedBase += dt * 0.06; }
      if (G.boss && !G.boss.dead) {
        G.boss.pullT -= dt;
        if (G.boss.pullT <= 0) {
          G.boss.pullT = rnd(10, 14); G.eff.pull = 1.6;
          G.bigText = { txt: 'Rüstem zinciri çekiyor!', t: 0, col: '#ff8a7a' };
          SFX.pull();
        }
      }
    }

    let overall = 0;
    const doneBalls = [];
    for (const ch of G.chains) {
      const L = ch.path.len;
      ch.bounce = Math.max(0, ch.bounce - dt * 4);
      if (ch.toSpawn > 0 && G.mode !== 'ending' && G.eff.back <= 0 && !(G.boss && G.boss.dead)) {
        const s0 = ch.segs[0];
        if (!s0 || s0.s0 > D * 2.2) { ch.segs.unshift({ s0: 0, balls: [newBall(ch)], v: 0 }); ch.toSpawn--; }
        else while (s0.s0 >= D && ch.toSpawn > 0) { s0.balls.unshift(newBall(ch)); s0.s0 -= D; ch.toSpawn--; }
      }
      const head = ch.segs.length ? headS(ch.segs[ch.segs.length - 1]) : 0;
      const prog = head / L;
      overall = Math.max(overall, prog);
      let target = G.speedBase * (G.mode === 'demo' ? 1.6 : 1);
      if (prog < (G.level.rush || 0.22) && G.destroyed === 0) target = RUSH_SPEED;
      else if (prog > 0.86) target *= 0.6;
      if (G.eff.pull > 0) target *= 2.6;
      if (G.eff.slow > 0) target *= 0.35;
      if (G.eff.back > 0) target = -170;
      if (G.mode === 'ending') target = 900;
      ch.speed += (target - ch.speed) * Math.min(1, dt * (ch.speed > target ? 2.2 : 4));
      if (ch.segs.length) {
        const s0 = ch.segs[0];
        s0.s0 += ch.speed * dt;
        if (s0.s0 < -D * 4) s0.s0 = -D * 4;
        for (let i = 1; i < ch.segs.length; i++) {
          const sg = ch.segs[i], pv = ch.segs[i - 1];
          const pc = pv.balls[pv.balls.length - 1], tc = sg.balls[0];
          if (G.mode !== 'ending' && compat(pc, tc) && pc.g >= 1 && tc.g >= 1) sg.v = Math.max(sg.v - 2000 * dt, -950);
          else sg.v = G.mode === 'ending' ? ch.speed : 0;
          sg.s0 += sg.v * dt;
        }
      }
      for (const sg of ch.segs) for (const b of sg.balls) {
        if (b.g < 1) { b.g = Math.min(1, b.g + dt / INSERT_TIME); if (b.g >= 1) { b.ins = null; doneBalls.push([ch, b]); } }
      }
      layout(ch);
      for (let i = 1; i < ch.segs.length; i++) {
        const pv = ch.segs[i - 1], sg = ch.segs[i];
        if (sg.balls[0].s - headS(pv) <= D) {
          const retract = sg.v < 0, join = pv.balls.length;
          pv.balls = pv.balls.concat(sg.balls);
          ch.segs.splice(i, 1); i--;
          layout(ch);
          if (retract) {
            SFX.clack(); G.shake = Math.max(G.shake, 3);
            if (!checkMatch(ch, i, join, true) && !checkMatch(ch, i, join - 1, true)) G.combo = 0;
            layout(ch);
          }
        }
      }
    }
    if (G.mode === 'play') G.maxProg = Math.max(G.maxProg, overall);

    // son şans
    if (G.mode === 'play' && !G.lastChance && overall > 0.93) {
      G.lastChance = true;
      G.eff.back = 2.2; G.eff.pull = 0;
      G.chains.forEach(ch => ch.speed = Math.min(ch.speed, 0));
      G.bigText = { txt: '⚡ Son Şans! ⚡', t: 0, col: '#ff9a6a' };
      G.flashes.push({ x: G.shooter.x, y: G.shooter.y, r: 400, t: 0, life: 0.6, col: '#ffffff' });
      SFX.lastChance(); SFX.vibrate(120);
      Save.ev('lastChance');
    }

    for (const [ch, ball] of doneBalls) {
      for (let i = 0; i < ch.segs.length; i++) {
        const k = ch.segs[i].balls.indexOf(ball);
        if (k < 0) continue;
        const hit = checkMatch(ch, i, k, false);
        if (ball.shot) {
          if (hit) {
            G.streak++;
            if (ball.gaps > 0) {
              const bonus = 100 * ball.gaps;
              G.score += bonus; Save.ev('gap');
              G.texts.push({ x: ball.x, y: ball.y - 46, txt: 'Boşluk Atışı +' + bonus, t: 0 });
              SFX.gap();
            }
          } else { G.streak = 0; G.combo = 0; }
          ball.shot = false;
        }
        break;
      }
    }
    G.chains.forEach(layout);

    // atışlar
    for (let si = G.shots.length - 1; si >= 0; si--) {
      const sh = G.shots[si];
      let hit = false, dead = false;
      const steps = 3;
      for (let st = 0; st < steps && !hit && !dead; st++) {
        sh.x += sh.vx * dt / steps; sh.y += sh.vy * dt / steps;
        for (const ob of G.obst) {
          if (obstActive(ob) && Math.hypot(ob.x - sh.x, ob.y - sh.y) < ob.r + R * 0.75) {
            dead = true; SFX.tink(); burst(sh.x, sh.y, '#e9dcc0', 8); burst(sh.x, sh.y, hexOf(sh.c), 6); G.streak = 0; G.misses++; break;
          }
        }
        if (dead) break;
        checkGaps(sh);
        for (const ch of G.chains) {
          for (let i = 0; i < ch.segs.length && !hit; i++) {
            const b = ch.segs[i].balls;
            for (let k = 0; k < b.length; k++) {
              if (b[k].s < 8 || covered(ch, b[k].s)) continue;
              const dx = b[k].x - sh.x, dy = b[k].y - sh.y;
              if (dx * dx + dy * dy < (D * 0.9) * (D * 0.9)) { insertShot(sh, ch, i, k); hit = true; break; }
            }
          }
          if (hit) break;
        }
      }
      if (hit || dead) { G.shots.splice(si, 1); continue; }
      if (sh.x < -60 || sh.x > W + 60 || sh.y < -60 || sh.y > H + 60) { G.shots.splice(si, 1); G.streak = 0; G.misses++; }
    }
    G.chains.forEach(layout);

    if (G.mode === 'play') {
      const pc = presentColors();
      if (pc.indexOf(S.cur) < 0) S.cur = pick(pc);
      if (pc.indexOf(S.next) < 0) S.next = pick(pc);
    }

    // sandığa ulaşma
    for (const ch of G.chains) {
      if (!ch.segs.length) continue;
      const last = ch.segs[ch.segs.length - 1], L = ch.path.len;
      if (headS(last) >= L - 4) {
        if (G.mode === 'demo') { setup(G.level, G.levelIdx, 'demo', 'demo'); return; }
        if (G.mode === 'play') { G.mode = 'ending'; G.endT = 0; G.shots = []; SFX.lose(); SFX.vibrate(200); }
        while (last.balls.length && last.balls[last.balls.length - 1].s >= L - 4) {
          last.balls.pop(); ch.bounce = 1;
          if (Math.random() < 0.5) coinBurst(ch.end.x, ch.end.y - 20, 2);
        }
        if (!last.balls.length) ch.segs.pop();
      }
      if (G.mode === 'play' && headS(last) / L > 0.8) {
        ch.warnT -= dt;
        if (ch.warnT <= 0) { SFX.warn(); ch.warnT = 1.1; }
      }
    }

    if (G.mode === 'ending') {
      G.endT += dt;
      if (!G.chains.some(ch => ch.segs.length) || G.endT > 4) {
        G.mode = 'lost';
        Save.ev('time', G.playTime); Save.ev('shotPops', G.shotPops);
        G.cb.onLose && G.cb.onLose({ score: G.score, survival: !!G.level.survival, kind: G.kind });
      }
    }

    // kazanma koşulları
    if (G.mode === 'play') {
      const gt = G.goal.type;
      const won = (gt === 'clear' && G.chains.every(ch => ch.toSpawn === 0 && !ch.segs.length)) ||
        (gt === 'gold' && G.gold >= G.goal.n) || (gt === 'survive' && G.survT >= G.goal.t) || (gt === 'boss' && G.boss.dead);
      if (won) winLevel();
    }

    updateFx(dt);
    if (G.mode === 'play' || G.mode === 'ending') hudUpdate();
  }

  function winLevel() {
    G.mode = 'won';
    Save.ev('time', G.playTime); Save.ev('shotPops', G.shotPops);
    const stars = G.maxProg < 0.66 ? 3 : G.maxProg < 0.84 ? 2 : 1;
    const bonus = Math.round((1 - G.maxProg) * 1000 / 10) * 10;
    G.score += bonus;
    // kalan topları sırayla patlat (görsel)
    let delay = 0;
    G.chains.forEach(ch => ch.segs.forEach(sg => sg.balls.forEach(b => {
      delay += 25;
      setTimeout(() => { G.pops.push({ x: b.x, y: b.y, c: b.c, t: 0 }); burst(b.x, b.y, hexOf(b.c), 4); }, delay);
    })));
    setTimeout(() => G.chains.forEach(ch => ch.segs = []), delay + 30);
    G.bigText = { txt: G.goal.type === 'boss' ? 'Zafer!' : 'Tamamlandı!', t: 0, col: '#ffd43a' };
    coinRain(Math.round(60 * partMul())); confetti(Math.round(90 * partMul()));
    for (let i = 0; i < 8; i++) setTimeout(() => SFX.coin(), 200 + i * 90);
    SFX.win(); SFX.vibrate(80);
    hudUpdate();
    const token = G.runId;
    const info = { score: G.score, stars, bonus, kind: G.kind, misses: G.misses, goal: G.goal.type, lastChance: G.lastChance };
    setTimeout(() => { if (G.runId === token && G.mode === 'won') G.cb.onWin && G.cb.onWin(info); }, 1500 + Math.min(delay, 1500));
  }

  function updateFx(dt) {
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i];
      p.t += dt;
      if (p.t >= p.life) { G.parts.splice(i, 1); continue; }
      if (p.type === 'ring') continue;
      if (p.g) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.spin += dt * 8; if (p.type === 'conf') { p.vx *= 0.985; p.vy = Math.min(p.vy, 260); } continue; }
      if (p.type === 'shard') { p.vy += 400 * dt; p.spin += dt * 10; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
    }
    for (let i = G.pops.length - 1; i >= 0; i--) { G.pops[i].t += dt; if (G.pops[i].t > 0.22) G.pops.splice(i, 1); }
    for (let i = G.texts.length - 1; i >= 0; i--) { G.texts[i].t += dt; if (G.texts[i].t > 1.1) G.texts.splice(i, 1); }
    for (let i = G.flashes.length - 1; i >= 0; i--) { G.flashes[i].t += dt; if (G.flashes[i].t > G.flashes[i].life) G.flashes.splice(i, 1); }
    if (G.bigText && G.mode !== 'paused') { G.bigText.t += dt; if (G.bigText.t > 1.3) G.bigText = null; }
    G.shake = Math.max(0, G.shake - dt * 30);
    if (G.hintT > 0 && G.mode === 'play') G.hintT -= dt;
    G.sparkT -= dt;
    if (G.sparkT <= 0 && G.chains.length) {
      G.sparkT = rnd(1.2, 2.6);
      const ch = pick(G.chains);
      G.parts.push({ x: ch.end.x + rnd(-36, 36), y: ch.end.y + rnd(-30, 10), vx: 0, vy: -20, t: 0, life: 0.7, r: rnd(4, 7), col: '#fff6c0', star: true });
    }
  }

  // ---------- çizim ----------
  function drawBall(c, x, y, r, opt) {
    opt = opt || {};
    if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
    if (c === JOKER) {
      ctx.drawImage(IMG.joker, x - r, y - r, r * 2, r * 2);
      if (!set().lowQuality) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'hsla(' + ((G.time * 120) % 360) + ',100%,70%,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 6.283); ctx.stroke(); ctx.restore();
      }
      if (opt.alpha !== undefined) ctx.globalAlpha = 1;
      return;
    }
    const base = IMG.balls[Save.d.skin] || IMG.balls.classic;
    ctx.drawImage(base[c], x - r, y - r, r * 2, r * 2);
    if (opt.pw) {
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 6);
      ctx.strokeStyle = 'rgba(255,230,120,' + (0.5 + pulse * 0.5) + ')';
      ctx.lineWidth = 3 + pulse * 2;
      ctx.beginPath(); ctx.arc(x, y, r + 2 + pulse * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.font = Math.round(r * 1.05) + 'px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(POWERS[opt.pw].icon, x, y + r * 0.06);
    } else {
      const em = IMG.em[c];
      const sty = set();
      const candy = (Save.d.skin === 'candy' || Save.d.skin === 'marble') && !sty.lowQuality;
      if (candy) { ctx.save(); ctx.shadowColor = 'rgba(40,10,0,0.85)'; ctx.shadowBlur = 5 * cam.dpr * cam.k; }
      const phase = opt.phase !== undefined && !sty.colorblind && !sty.lowQuality ? opt.phase : 0;
      if (sty.colorblind) {
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 4;
        ctx.drawImage(em, x - r * 1.12, y - r * 1.12, r * 2.24, r * 2.24); ctx.restore();
      } else if (phase === 0) {
        ctx.drawImage(em, x - r, y - r, r * 2, r * 2);
      } else {
        const cs = Math.cos(phase), sn = Math.sin(phase);
        if (cs > -0.15) {
          const a0 = ctx.globalAlpha;
          ctx.globalAlpha = a0 * Math.min(1, (cs + 0.15) * 3);
          ctx.save();
          ctx.translate(x, y); ctx.rotate(opt.dir);
          ctx.translate(sn * r * 0.78, 0);
          ctx.scale(Math.max(0.08, cs), 1);
          ctx.drawImage(em, -r, -r, r * 2, r * 2);
          ctx.restore();
          ctx.globalAlpha = a0;
        }
      }
      if (candy) ctx.restore();
    }
    if (opt.kind === 'gold') {
      const cr = r * 0.42, cx = x + r * 0.55, cy = y - r * 0.55;
      const spin = Math.abs(Math.cos(G.time * 3 + x * 0.01));
      ctx.fillStyle = '#9a5f00'; ctx.beginPath(); ctx.ellipse(cx, cy + 1.5, cr * spin + 1, cr, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.ellipse(cx, cy, cr * spin + 1, cr, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,220,0.85)'; ctx.beginPath(); ctx.ellipse(cx - cr * 0.3 * spin, cy - cr * 0.3, cr * 0.25 * spin + 0.5, cr * 0.25, 0, 0, 6.283); ctx.fill();
    }
    if (opt.ice) {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 1.08);
      g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(0.5, 'rgba(190,235,255,0.55)'); g.addColorStop(1, 'rgba(120,190,240,0.7)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.06, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y - r * 0.1); ctx.lineTo(x - r * 0.1, y + r * 0.15); ctx.lineTo(x + r * 0.2, y - r * 0.4);
      ctx.moveTo(x - r * 0.1, y + r * 0.15); ctx.lineTo(x + r * 0.05, y + r * 0.6);
      ctx.moveTo(x + r * 0.2, y - r * 0.4); ctx.lineTo(x + r * 0.62, y - r * 0.2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160,215,255,0.95)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, r * 1.04, 0, 6.283); ctx.stroke();
    }
    if (opt.alpha !== undefined) ctx.globalAlpha = 1;
  }

  function cannonImg() { return IMG.cannons[Save.d.cannon] || IMG.cannons.royal; }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!G.level) { ctx.fillStyle = '#c4573b'; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
    buildLayers();
    const sx = G.shake ? rnd(-G.shake, G.shake) : 0, sy = G.shake ? rnd(-G.shake, G.shake) : 0;
    if (sx || sy) { ctx.fillStyle = '#c4573b'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(layer, Math.round(sx * cam.dpr), Math.round(sy * cam.dpr));
    setWorldTransform(sx, sy);
    const lowQ = set().lowQuality;

    // portallar (zeminde dönen halkalar)
    G.chains.forEach(ch => ch.hidden.forEach(h => [h[0], h[1]].forEach((s, i) => {
      const p = ch.path.pos(s, {});
      ctx.save(); ctx.translate(p.x, p.y);
      for (let k = 0; k < 3; k++) {
        ctx.rotate(G.time * (i ? -2 : 2) + k);
        ctx.strokeStyle = ['rgba(150,90,255,0.9)', 'rgba(90,200,255,0.8)', 'rgba(255,255,255,0.7)'][k];
        ctx.lineWidth = 5 - k; ctx.beginPath(); ctx.arc(0, 0, 36 - k * 7, 0.3, 5.2); ctx.stroke();
      }
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
      g.addColorStop(0, 'rgba(20,0,50,0.85)'); g.addColorStop(1, 'rgba(60,20,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 6.283); ctx.fill();
      ctx.restore();
    })));

    if (!lowQ) {
      ctx.fillStyle = 'rgba(40,30,10,0.28)';
      for (const [ch, b] of allBalls()) {
        if (b.s < 0 || inRanges(ch.hidden, b.s, 0)) continue;
        ctx.beginPath(); ctx.ellipse(b.x + 3, b.y + 6, R * 0.95, R * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const ch of G.chains) for (const sg of ch.segs) for (const b of sg.balls) {
      if (b.s < -R) continue;
      let alpha = b.s < 26 ? Math.max(0, (b.s + R) / (26 + R)) : 1;
      // portal içinde gizle, kenarlarda soldur
      for (const h of ch.hidden) {
        if (b.s > h[0] - R && b.s < h[1] + R) {
          const d = Math.min(Math.abs(b.s - h[0]), Math.abs(b.s - h[1]));
          alpha = (b.s > h[0] && b.s < h[1]) ? 0 : Math.min(alpha, d / R);
        }
      }
      if (alpha <= 0.02) continue;
      const r = b.ins ? R * (0.85 + 0.15 * b.g) : R;
      drawBall(b.c, b.x, b.y, r, { alpha, pw: b.pw, kind: b.kind, ice: b.ice, phase: b.ins ? 0 : b.s / R, dir: ch.path.angle(b.s) });
    }
    for (const p of G.pops) { const t = p.t / 0.22; drawBall(p.c, p.x, p.y, R * (1 + t * 0.5), { alpha: 1 - t }); }

    if (!overlayEmpty) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(overlay, Math.round(sx * cam.dpr), Math.round(sy * cam.dpr)); setWorldTransform(sx, sy); }
    G.obst.filter(ob => !ob.static).forEach(ob => {
      if (ob.on < 0.05) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ob.x, ob.y, ob.r, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); return; }
      drawPillar(ctx, ob.x, ob.y, ob.r * (0.6 + 0.4 * ob.on), ob.on);
    });

    // sandıklar
    for (const ch of G.chains) {
      const L = ch.path.len, end = ch.end;
      const head = ch.segs.length ? headS(ch.segs[ch.segs.length - 1]) : 0;
      const danger = (G.mode === 'play' || G.mode === 'ending') ? Math.max(0, (head / L - 0.72) / 0.28) : 0;
      const pulse = danger > 0 ? (Math.sin(G.time * (6 + danger * 8)) * 0.5 + 0.5) : 0;
      if (danger > 0) {
        const g = ctx.createRadialGradient(end.x, end.y, 10, end.x, end.y, 110);
        g.addColorStop(0, 'rgba(255,40,40,' + (0.55 * danger * (0.5 + pulse * 0.5)) + ')');
        g.addColorStop(1, 'rgba(255,40,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(end.x, end.y, 110, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      ctx.translate(end.x + (danger ? rnd(-1, 1) * danger * 2.5 : 0), end.y);
      ctx.rotate(-cam.rot);
      const bob = Math.sin(G.time * 2) * 0.012;
      const sc = 1 + pulse * 0.05 * danger + ch.bounce * 0.12 + bob;
      ctx.scale(sc, 2 - sc - ch.bounce * 0.1);
      ctx.fillStyle = 'rgba(30,20,5,0.3)';
      ctx.beginPath(); ctx.ellipse(4, 44, 50, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(IMG.chest, -52, -58, 104, 114);
      ctx.restore();
    }

    // patron
    if (G.boss) drawBoss();

    const S = G.shooter;
    if (G.mode === 'play' && ((G.aim.show && set().aim) || G.eff.aim > 0)) drawAim();

    for (const sh of G.shots) {
      drawBall(sh.c, sh.x - sh.vx * 0.012, sh.y - sh.vy * 0.012, R * 0.9, { alpha: 0.25 });
      drawBall(sh.c, sh.x, sh.y, R);
    }

    ctx.save();
    ctx.translate(S.x, S.y);
    ctx.fillStyle = 'rgba(30,20,5,0.3)';
    ctx.beginPath(); ctx.ellipse(5, 9, 64, 60, 0, 0, Math.PI * 2); ctx.fill();
    if (G.eff.slow > 0 || G.eff.back > 0 || G.eff.aim > 0) {
      ctx.strokeStyle = 'rgba(160,240,255,' + (0.4 + 0.3 * Math.sin(G.time * 8)) + ')';
      ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.rotate(S.ang + Math.PI / 2);
    const rec = S.recoil * 9, cw2 = 128, chh = cw2 * 400 / 373;
    ctx.drawImage(cannonImg(), -cw2 / 2, -chh * 0.54 + rec, cw2, chh);
    drawBall(S.next, 0, 21 + rec, 11 + S.swapT * 4);
    ctx.restore();
    if (G.mode === 'play' || G.mode === 'paused' || G.mode === 'demo') {
      const m = muzzle(66 - S.recoil * 14);
      drawBall(S.cur, m.x, m.y, R * Math.max(0.4, 1 - S.recoil * 0.6));
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of G.flashes) {
      const t = f.t / f.life;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * (0.6 + t * 0.6));
      g.addColorStop(0, 'rgba(255,255,230,' + (0.55 * (1 - t)) + ')');
      g.addColorStop(0.4, hexA(f.col, 0.35 * (1 - t)));
      g.addColorStop(1, hexA(f.col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 1.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    for (const p of G.parts) {
      const t = p.t / p.life;
      if (p.type === 'ring') {
        ctx.strokeStyle = p.col; ctx.globalAlpha = 1 - t; ctx.lineWidth = 6 * (1 - t);
        ctx.beginPath(); ctx.arc(p.x, p.y, 20 + t * 60, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; continue;
      }
      if (p.type === 'coin') {
        ctx.globalAlpha = Math.min(1, (1 - t) * 3);
        const w = Math.abs(Math.cos(p.spin)) * p.r + 1.5;
        ctx.fillStyle = '#b8770c'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 1.5, w, p.r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.ellipse(p.x, p.y, w, p.r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,220,0.8)'; ctx.beginPath(); ctx.ellipse(p.x - w * 0.3, p.y - p.r * 0.35, w * 0.3, p.r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; continue;
      }
      if (p.type === 'conf' || p.type === 'shard') {
        ctx.globalAlpha = Math.min(1, (1 - t) * 3);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
        if (p.type === 'shard') {
          ctx.fillStyle = 'rgba(210,240,255,0.95)';
          ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.lineTo(p.r * 0.6, p.r * 0.6); ctx.lineTo(-p.r * 0.6, p.r * 0.4); ctx.closePath(); ctx.fill();
        } else { ctx.fillStyle = p.col; ctx.fillRect(-p.r, -p.r * 0.45 * Math.abs(Math.cos(p.spin * 1.3)), p.r * 2, p.r * 0.9 * Math.abs(Math.cos(p.spin * 1.3)) + 1); }
        ctx.restore(); ctx.globalAlpha = 1; continue;
      }
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.star ? '#fff8d0' : p.col;
      const r = p.r * (1 - t * 0.5);
      if (p.star) drawStar(p.x, p.y, r * 1.6, p.t * 8);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }

    drawWeather();

    // ---- ekran uzayı ----
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    if (G.flash > 0) { ctx.fillStyle = 'rgba(230,240,255,' + (G.flash * 0.45) + ')'; ctx.fillRect(0, 0, cam.sw, cam.sh); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of G.texts) {
      const p = toScreen(t.x, t.y);
      const fs = Math.max(16, 26 * cam.k);
      ctx.font = '800 ' + fs + 'px "Baloo 2", system-ui, sans-serif';
      ctx.globalAlpha = Math.max(0, Math.min(1, 2 - t.t * 1.8));
      outlinedText(t.txt, p.x, p.y - t.t * 50, t.col || '#fff', 'rgba(60,30,0,0.85)', fs * 0.18);
      ctx.globalAlpha = 1;
    }
    if (G.bigText && G.bigText.t >= 0) {
      const b = G.bigText, t = b.t;
      const sc = t < 0.18 ? ease(t / 0.18) * 1.15 : t < 0.3 ? 1.15 - (t - 0.18) / 0.12 * 0.15 : 1;
      const a = t > 1 ? 1 - (t - 1) / 0.3 : 1;
      let fs = Math.max(34, 72 * cam.k) * sc;
      ctx.font = '800 ' + fs + 'px "Baloo 2", system-ui, sans-serif';
      const w = ctx.measureText(b.txt).width;
      if (w > cam.sw * 0.9) { fs *= cam.sw * 0.9 / w; ctx.font = '800 ' + fs + 'px "Baloo 2", system-ui, sans-serif'; }
      ctx.globalAlpha = Math.max(0, a);
      outlinedText(b.txt, cam.cx, cam.cy - (cam.rot ? 0 : cam.sh * 0.12), b.col, '#5a2a00', fs * 0.14);
      ctx.globalAlpha = 1;
    }
    const act = ['slow', 'back', 'aim'].filter(k => G.eff[k] > 0);
    if (act.length && G.mode === 'play') {
      const sz = Math.max(30, 44 * Math.min(1, cam.k * 1.2));
      const top = cam.cy - (cam.rot ? (VIEW.x1 - VIEW.x0) : (VIEW.y1 - VIEW.y0)) * cam.k / 2 + sz * 0.7;
      act.forEach((k, i) => {
        const x = cam.sw / 2 + (i - (act.length - 1) / 2) * sz * 1.3, y = top;
        ctx.fillStyle = 'rgba(20,40,90,0.75)'; ctx.beginPath(); ctx.arc(x, y, sz / 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffd43a'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y, sz / 2 - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, G.eff[k] / POWERS[k].time)); ctx.stroke();
        ctx.font = (sz * 0.5) + 'px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        ctx.fillStyle = '#fff'; ctx.fillText(POWERS[k].icon, x, y + 1);
      });
    }
    if (G.mode === 'play' && G.hintT > 0) {
      const fs = Math.max(15, 24 * cam.k);
      ctx.font = '800 ' + fs + 'px "Baloo 2", system-ui, sans-serif';
      ctx.globalAlpha = Math.min(1, G.hintT);
      const touch = matchMedia('(pointer: coarse)').matches;
      const txt = touch ? 'Parmağınla nişan al, bırakınca ateş et · Topa dokun: değiştir' : 'Fareyle nişan al, tıkla: ateş · Sağ tık / Boşluk: değiştir';
      const w = ctx.measureText(txt).width, maxW = cam.sw * 0.94;
      if (w > maxW) ctx.font = '800 ' + (fs * maxW / w) + 'px "Baloo 2", system-ui, sans-serif';
      outlinedText(txt, cam.sw / 2, cam.sh - Math.max(24, 34 * cam.k), '#fff', 'rgba(40,20,0,0.9)', fs * 0.2);
      ctx.globalAlpha = 1;
    }
  }

  function drawBoss() {
    const B = G.boss, p = bossPos();
    if (B.dead && G.mode !== 'play' && G.mode !== 'won') return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-cam.rot);
    const dead = B.dead;
    const hop = Math.abs(Math.sin(G.time * (G.eff.pull > 0 ? 12 : 3))) * (G.eff.pull > 0 ? 10 : 4);
    const shake = B.hitT > 0 ? rnd(-4, 4) : 0;
    if (dead) ctx.globalAlpha = Math.max(0, 1 - (G.time % 100) * 0); // görünür kalır, kaçar
    const w = 112, h = w * 330 / 300;
    ctx.fillStyle = 'rgba(30,20,5,0.3)'; ctx.beginPath(); ctx.ellipse(0, h * 0.45, 34, 10, 0, 0, 6.283); ctx.fill();
    ctx.save();
    ctx.translate(shake, -hop);
    if (dead) { ctx.translate(0, 0); ctx.rotate(Math.sin(G.time * 20) * 0.1); }
    ctx.drawImage(IMG.raccoon, -w / 2, -h * 0.55, w, h);
    if (B.hitT > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,60,60,' + (B.hitT * 1.5) + ')'; ctx.fillRect(-w / 2, -h * 0.55, w, h); }
    ctx.restore();
    // can barı
    const bw = 104, bh = 13, by = -h * 0.55 - 16;
    ctx.fillStyle = '#3a1d00'; roundRect(-bw / 2 - 3, by - 3, bw + 6, bh + 6, 8); ctx.fill();
    ctx.fillStyle = '#5b1620'; roundRect(-bw / 2, by, bw, bh, 6); ctx.fill();
    const f = B.hp / B.max;
    if (f > 0) { const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#ff8a7a'); g.addColorStop(1, '#d6202f'); ctx.fillStyle = g; roundRect(-bw / 2, by, bw * f, bh, 6); ctx.fill(); }
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function outlinedText(txt, x, y, fill, stroke, lw) {
    ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = lw * 2;
    ctx.strokeText(txt, x, y + lw * 0.5); ctx.strokeText(txt, x, y);
    ctx.fillStyle = fill; ctx.fillText(txt, x, y);
  }
  function drawStar(x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }
  function drawAim() {
    const S = G.shooter, m = muzzle(66);
    const dx = Math.cos(S.ang), dy = Math.sin(S.ang);
    let x = m.x, y = m.y, len = 0, hit = false;
    while (len < 1600 && !hit) {
      x += dx * 6; y += dy * 6; len += 6;
      if (x < 0 || x > W || y < 0 || y > H) break;
      for (const ob of G.obst) if (obstActive(ob) && Math.hypot(ob.x - x, ob.y - y) < ob.r + R * 0.6) { hit = true; break; }
      if (hit) break;
      for (const ch of G.chains) {
        for (const sg of ch.segs) {
          for (const b of sg.balls) {
            if (b.s < 8 || covered(ch, b.s)) continue;
            const ex = b.x - x, ey = b.y - y;
            if (ex * ex + ey * ey < R * R) { hit = true; break; }
          }
          if (hit) break;
        }
        if (hit) break;
      }
    }
    const strong = G.eff.aim > 0;
    ctx.save();
    ctx.strokeStyle = strong ? '#ffffff' : hexOf(S.cur);
    ctx.globalAlpha = strong ? 0.85 : 0.55;
    ctx.lineWidth = strong ? 7 : 5; ctx.lineCap = 'round';
    ctx.setLineDash(strong ? [10, 10] : [2, 14]);
    ctx.lineDashOffset = -G.time * 60;
    if (strong) { ctx.shadowColor = hexOf(S.cur); ctx.shadowBlur = 12; }
    ctx.beginPath(); ctx.moveTo(m.x + dx * 20, m.y + dy * 20); ctx.lineTo(x, y); ctx.stroke();
    if (hit) { ctx.setLineDash([]); ctx.beginPath(); ctx.arc(x, y, R * 0.9, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- giriş ----------
  let pointerDown = false, downOnShooter = false, downId = null;
  function aimAt(e) {
    const p = toWorld(e.clientX, e.clientY);
    const S = G.shooter;
    if (Math.hypot(p.x - S.x, p.y - S.y) > 30) S.ang = Math.atan2(p.y - S.y, p.x - S.x);
  }
  canvas.addEventListener('pointerdown', e => {
    SFX.unlock();
    if (G.mode !== 'play') return;
    if (e.button === 2) { swap(); return; }
    const p = toWorld(e.clientX, e.clientY), S = G.shooter;
    downOnShooter = Math.hypot(p.x - S.x, p.y - S.y) < 62;
    pointerDown = true; downId = e.pointerId;
    if (!downOnShooter) aimAt(e);
    G.aim.show = !downOnShooter;
    if (e.pointerType === 'mouse' && !downOnShooter) shoot();
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
  });
  canvas.addEventListener('pointermove', e => {
    if (G.mode !== 'play') return;
    if (e.pointerType === 'mouse') { aimAt(e); G.aim.show = true; return; }
    if (pointerDown && e.pointerId === downId) {
      const p = toWorld(e.clientX, e.clientY), S = G.shooter;
      if (downOnShooter && Math.hypot(p.x - S.x, p.y - S.y) > 70) downOnShooter = false;
      if (!downOnShooter) { aimAt(e); G.aim.show = true; }
    }
  });
  canvas.addEventListener('pointerup', e => {
    if (!pointerDown || e.pointerId !== downId) return;
    pointerDown = false;
    if (G.mode !== 'play') return;
    if (e.pointerType !== 'mouse') { if (downOnShooter) swap(); else shoot(); G.aim.show = false; }
    else if (downOnShooter) swap();
  });
  canvas.addEventListener('pointercancel', () => { pointerDown = false; G.aim.show = false; });
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') G.aim.show = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && G.mode === 'play') { e.preventDefault(); swap(); }
    if (e.code === 'Escape' || e.code === 'KeyP') G.cb.onPauseKey && G.cb.onPauseKey();
  });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') G.cb.onPauseKey && G.cb.onPauseKey(); });

  // ---------- döngü ----------
  let last = performance.now(), fpsAcc = 0, fpsN = 0;
  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 1) { G.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    if (dt > 0.05) dt = 0.05;
    dt *= G.timeScale || 1;
    if (G.mode !== 'loading') {
      const n = Math.ceil(dt / 0.017);
      for (let i = 0; i < n; i++) update(dt / n);
    }
    try { render(); } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  }

  function hudUpdate() {
    if (!G.cb.onHud) return;
    let danger = 0;
    G.chains.forEach(ch => { if (ch.segs.length) danger = Math.max(danger, headS(ch.segs[ch.segs.length - 1]) / ch.path.len); });
    const g = G.goal;
    let progress, goalTxt = '';
    if (G.level && G.level.survival) progress = G.surv.t / 20;
    else if (g.type === 'gold') { progress = G.gold / g.n; goalTxt = '🪙 ' + Math.min(G.gold, g.n) + '/' + g.n; }
    else if (g.type === 'survive') { const left = Math.max(0, Math.ceil(g.t - G.survT)); progress = G.survT / g.t; goalTxt = '⏱ ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); }
    else if (g.type === 'boss') { progress = G.boss ? 1 - G.boss.hp / G.boss.max : 0; goalTxt = '🦝 ' + (G.boss ? G.boss.hp : 0); }
    else progress = G.total && isFinite(G.total) ? G.destroyed / G.total : 0;
    G.cb.onHud({ score: G.score, progress: Math.min(1, progress), danger, survLvl: G.surv.lvl, goalTxt });
  }

  window.Game = {
    init(cb) {
      G.cb = cb || {};
      resize();
      loadImages(() => {
        setup(LEVELS[0], 0, 'demo', 'demo');
        requestAnimationFrame(t => { last = t; frame(t); });
        G.cb.onReady && G.cb.onReady();
      });
    },
    start(idx) { setup(LEVELS[idx], idx, 'play', 'level'); G.hintT = idx === 0 ? 6 : 0; },
    startSurvival() { setup(SURVIVAL, -1, 'play', 'survival'); },
    startCustom(level) { setup(level, -1, 'play', 'custom'); },
    startWeekly(level) { setup(level, -1, 'play', 'weekly'); },
    demo() { const i = Math.floor(Math.random() * 6) * 5; setup(LEVELS[i], i, 'demo', 'demo'); },
    pause() { if (G.mode === 'play') G.mode = 'paused'; G.aim.show = false; },
    resume() { if (G.mode === 'paused') G.mode = 'play'; last = performance.now(); },
    refresh() { resize(); layerKey = ''; SFX.vib = set().vibrate; },
    get mode() { return G.mode; },
    get levelIdx() { return G.levelIdx; },
    get kind() { return G.kind; },
    get score() { return G.score; },
    _G: G, _shoot: shoot
  };
})();
