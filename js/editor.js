// Bölüm editörü
(function () {
  'use strict';
  const W = 1600, H = 893, D = 46;
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const KEY = 'kz_editor';

  const IMG = {};
  ['bg1', 'bg2', 'bg3', 'bg4', 'bg5', 'bg6', 'cannon', 'chest', 'pillar'].forEach(k => {
    IMG[k] = new Image();
    IMG[k].src = 'assets/img/' + k + (k.startsWith('bg') ? '.jpg' : '.png');
    IMG[k].onload = () => { layerDirty = true; draw(); };
  });
  IMG.ball = new Image(); IMG.ball.src = 'assets/img/ball_blue.png';

  const blank = () => ({ name: 'Yeni Bölüm', bg: 'bg1', paths: [[]], shooter: [800, 482], colors: 4, count: 50, speed: 30, pw: 0.06, obstacles: [], tunnels: [] });
  let L = null;
  try { L = JSON.parse(localStorage.getItem(KEY)); } catch (_) { }
  if (!L || !L.paths) L = blank();
  let active = 0, tool = 'path';
  const history = [];
  const snap = () => { history.push(JSON.stringify(L)); if (history.length > 80) history.shift(); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (_) { } };

  // ---- form ----
  ['bg1', 'bg2', 'bg3', 'bg4', 'bg5', 'bg6'].forEach((b, i) => {
    const o = document.createElement('option'); o.value = b;
    o.textContent = ['Bahçe', 'Tarhlı bahçe', 'Gün batımı', 'Gün batımı tarhlı', 'Gece', 'Gece tarhlı'][i];
    $('fBg').appendChild(o);
  });
  LEVELS.forEach((lv, i) => { const o = document.createElement('option'); o.value = i; o.textContent = (i + 1) + '. ' + lv.name; $('fLoad').appendChild(o); });
  function syncForm() {
    $('fName').value = L.name; $('fBg').value = L.bg; $('fColors').value = L.colors;
    $('fCount').value = L.count; $('fSpeed').value = L.speed; $('fPw').value = Math.round((L.pw || 0) * 100);
    document.querySelectorAll('[data-path]').forEach(b => b.classList.toggle('on', +b.dataset.path === active));
  }
  const clampN = (v, a, b, d) => { v = +v; return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };
  $('fName').oninput = e => { L.name = e.target.value; save(); };
  $('fBg').onchange = e => { snap(); L.bg = e.target.value; layerDirty = true; save(); draw(); };
  $('fColors').onchange = e => { L.colors = clampN(e.target.value, 3, 6, 4); syncForm(); save(); };
  $('fCount').onchange = e => { L.count = clampN(e.target.value, 5, 300, 50); syncForm(); save(); };
  $('fSpeed').onchange = e => { L.speed = clampN(e.target.value, 10, 90, 30); syncForm(); save(); };
  $('fPw').onchange = e => { L.pw = clampN(e.target.value, 0, 30, 6) / 100; syncForm(); save(); };
  $('fLoad').onchange = e => {
    if (e.target.value === '') return;
    snap(); const src = LEVELS[+e.target.value];
    L = JSON.parse(JSON.stringify(Object.assign(blank(), src)));
    L.obstacles = L.obstacles || []; L.tunnels = L.tunnels || [];
    active = 0; e.target.value = ''; layerDirty = true; syncForm(); save(); draw();
  };
  document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => {
    tool = b.dataset.tool;
    document.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x === b));
  });
  document.querySelectorAll('[data-path]').forEach(b => b.onclick = () => {
    active = +b.dataset.path;
    if (!L.paths[active]) { snap(); L.paths[active] = []; }
    syncForm(); draw();
  });
  $('delPath').onclick = () => {
    snap();
    if (active === 1) { L.paths.splice(1, 1); active = 0; } else { L.paths[0] = L.paths[1] || []; L.paths.splice(1, 1); }
    if (!L.paths.length) L.paths = [[]];
    layerDirty = true; syncForm(); save(); draw();
  };
  $('undo').onclick = () => { if (history.length) { L = JSON.parse(history.pop()); active = Math.min(active, L.paths.length - 1); layerDirty = true; syncForm(); save(); draw(); } };
  $('clear').onclick = () => { if (confirmClear()) { snap(); L = blank(); active = 0; layerDirty = true; syncForm(); save(); draw(); } };
  let clearArmed = 0;
  function confirmClear() { const now = Date.now(); if (now - clearArmed < 2500) return true; clearArmed = now; toast('Silmek için tekrar bas'); return false; }
  $('test').onclick = () => {
    const lv = exportLevel();
    if (!lv.paths.length) { toast('Önce en az 2 noktalı bir yol çiz'); return; }
    localStorage.setItem('kz_custom', JSON.stringify(lv));
    location.href = 'index.html?custom=1';
  };
  $('json').onclick = () => { $('jsonText').value = JSON.stringify(exportLevel(), null, 1).replace(/\[\s+(-?\d+),\s+(-?\d+)\s+\]/g, '[$1, $2]'); $('dlg').showModal(); };
  $('jsonClose').onclick = () => $('dlg').close();
  $('jsonCopy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText($('jsonText').value).then(() => toast('Kopyalandı')); };
  $('jsonLoad').onclick = () => {
    try {
      const o = JSON.parse($('jsonText').value);
      if (!o.paths) throw 0;
      snap(); L = Object.assign(blank(), o); L.obstacles = L.obstacles || []; L.tunnels = L.tunnels || [];
      active = 0; layerDirty = true; syncForm(); save(); draw(); $('dlg').close(); toast('Yüklendi');
    } catch (_) { toast('Geçersiz JSON'); }
  };
  function exportLevel() {
    const r = v => Math.round(v);
    return {
      name: L.name, bg: L.bg,
      paths: L.paths.filter(p => p.length >= 2).map(p => p.map(q => [r(q[0]), r(q[1])])),
      shooter: [r(L.shooter[0]), r(L.shooter[1])], colors: L.colors, count: L.count, speed: L.speed, pw: L.pw,
      obstacles: L.obstacles.map(o => [r(o[0]), r(o[1])]), tunnels: L.tunnels.map(t => t.map(r))
    };
  }
  let toastT;
  function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 1800); }

  // ---- görünüm ----
  let k = 1, ox = 0, oy = 0, dpr = 1, layer = null, layerDirty = true, paths = [];
  function resize() {
    const top = $('bar').offsetHeight;
    const wrap = $('wrap'); wrap.style.top = top + 'px';
    const w = window.innerWidth, h = window.innerHeight - top;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
    k = Math.min(w / W, h / H); ox = (w - W * k) / 2; oy = (h - H * k) / 2;
    layerDirty = true; draw();
  }
  const toW = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - ox) / k, (e.clientY - r.top - oy) / k]; };

  function rebuild() {
    paths = L.paths.map(p => p.length >= 2 ? KZPath.buildPath(p) : null);
    layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    const c = layer.getContext('2d');
    if (IMG[L.bg].complete) c.drawImage(IMG[L.bg], 0, 0, W, H);
    paths.forEach(p => p && KZPath.drawTrack(c, p, { night: L.bg === 'bg5' || L.bg === 'bg6' }));
    paths.forEach(p => p && L.tunnels.forEach(b => p.rangesInBox(b).forEach(rg => KZPath.drawBridge(c, p, rg[0], rg[1]))));
    layerDirty = false;
  }

  function problems() {
    const out = [];
    // atıcı yola çok yakın mı
    paths.forEach(p => {
      if (!p) return;
      for (let i = 0; i < p.xs.length; i += 4) {
        if (Math.hypot(p.xs[i] - L.shooter[0], p.ys[i] - L.shooter[1]) < 64 + 30) { out.push([p.xs[i], p.ys[i]]); }
      }
    });
    // şeritler birbirine çok yakın mı (aynı yol veya iki yol)
    const pts = [];
    paths.forEach((p, pi) => { if (p) for (let i = 0; i < p.xs.length; i += 10) pts.push([p.xs[i], p.ys[i], pi, i * p.step]); });
    for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
      const A = pts[a], B = pts[b];
      if (A[2] === B[2] && Math.abs(A[3] - B[3]) < 140) continue;
      if (Math.hypot(A[0] - B[0], A[1] - B[1]) < 60) out.push([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]);
    }
    return out;
  }

  function draw() {
    if (layerDirty) rebuild();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e2350'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);
    ctx.drawImage(layer, 0, 0);
    // top önizleme
    ctx.globalAlpha = 0.45;
    const tmp = {};
    paths.forEach(p => { if (!p) return; for (let s = D; s < p.len - D / 2; s += D) { p.pos(s, tmp); ctx.drawImage(IMG.ball, tmp.x - 23, tmp.y - 23, 46, 46); } });
    ctx.globalAlpha = 1;
    // sütunlar
    L.obstacles.forEach(o => ctx.drawImage(IMG.pillar, o[0] - 36, o[1] - 36, 72, 72));
    // köprü kutuları
    ctx.setLineDash([8, 6]); ctx.strokeStyle = '#ffe48a'; ctx.lineWidth = 3;
    L.tunnels.forEach(t => ctx.strokeRect(Math.min(t[0], t[2]), Math.min(t[1], t[3]), Math.abs(t[2] - t[0]), Math.abs(t[3] - t[1])));
    if (drag && drag.type === 'tunnel') ctx.strokeRect(Math.min(drag.x0, drag.x1), Math.min(drag.y0, drag.y1), Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0));
    ctx.setLineDash([]);
    // sandıklar
    paths.forEach(p => { if (!p) return; const e = p.pos(p.len, {}); ctx.drawImage(IMG.chest, e.x - 52, e.y - 58, 104, 114); });
    // atıcı
    ctx.save(); ctx.translate(L.shooter[0], L.shooter[1]);
    ctx.drawImage(IMG.cannon, -64, -69, 128, 137); ctx.restore();
    // kontrol noktaları
    L.paths.forEach((p, pi) => {
      const act = pi === active;
      ctx.strokeStyle = act ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.setLineDash([]);
      p.forEach((q, i) => {
        ctx.fillStyle = i === 0 ? '#36d65a' : i === p.length - 1 ? '#ff3b52' : (act ? '#ffd43a' : '#c9c9c9');
        ctx.strokeStyle = '#3a1d00'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(q[0], q[1], act ? 11 : 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (act) { ctx.fillStyle = '#3a1d00'; ctx.font = '800 11px "Baloo 2", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i + 1, q[0], q[1] + 1); }
      });
    });
    // sorunlar
    const pr = problems();
    ctx.fillStyle = 'rgba(255,40,40,.75)';
    pr.forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, Math.PI * 2); ctx.fill(); });
    // bilgi
    let html = '';
    paths.forEach((p, i) => { if (p) html += 'Yol ' + (i + 1) + ': ' + Math.round(p.len) + ' px · ekrana ~' + Math.floor(p.len / D) + ' top sığar<br>'; });
    if (!html) html = 'Yol çizmek için tıklamaya başla.<br>';
    html += 'Renk ' + L.colors + ' · ' + L.count + ' top' + (L.paths.length > 1 ? ' (her yol)' : '') + ' · hız ' + L.speed;
    if (pr.length) html += '<br><span class="warn">⚠ Kırmızı yerlerde yol çakışıyor veya atıcıya çok yakın</span>';
    $('info').innerHTML = html;
  }

  // ---- fare / dokunma ----
  let drag = null;
  function nearestPoint(x, y, r) {
    let best = null, bd = r;
    L.paths.forEach((p, pi) => p.forEach((q, i) => { const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = [pi, i]; } }));
    return best;
  }
  function eraseAt(x, y) {
    const np = nearestPoint(x, y, 20);
    if (np) { snap(); L.paths[np[0]].splice(np[1], 1); return true; }
    const oi = L.obstacles.findIndex(o => Math.hypot(o[0] - x, o[1] - y) < 36);
    if (oi >= 0) { snap(); L.obstacles.splice(oi, 1); return true; }
    const ti = L.tunnels.findIndex(t => x >= Math.min(t[0], t[2]) && x <= Math.max(t[0], t[2]) && y >= Math.min(t[1], t[3]) && y <= Math.max(t[1], t[3]));
    if (ti >= 0) { snap(); L.tunnels.splice(ti, 1); return true; }
    return false;
  }
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    const [x, y] = toW(e);
    try { cv.setPointerCapture(e.pointerId); } catch (_) { }
    if (e.button === 2 || tool === 'erase') { if (eraseAt(x, y)) { layerDirty = true; save(); draw(); } return; }
    if (tool === 'path') {
      const np = nearestPoint(x, y, 18);
      if (np) { snap(); active = np[0]; syncForm(); drag = { type: 'pt', pi: np[0], i: np[1] }; return; }
      snap(); L.paths[active].push([x, y]); drag = { type: 'pt', pi: active, i: L.paths[active].length - 1 };
      layerDirty = true; save(); draw(); return;
    }
    if (tool === 'insert') {
      const p = L.paths[active]; if (p.length < 2) return;
      let best = 0, bd = 1e9;
      for (let i = 0; i < p.length - 1; i++) {
        const ax = p[i][0], ay = p[i][1], bx = p[i + 1][0], by = p[i + 1][1];
        const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
        const d = Math.hypot(ax + (bx - ax) * t - x, ay + (by - ay) * t - y);
        if (d < bd) { bd = d; best = i; }
      }
      snap(); p.splice(best + 1, 0, [x, y]); drag = { type: 'pt', pi: active, i: best + 1 };
      layerDirty = true; save(); draw(); return;
    }
    if (tool === 'shooter') { snap(); L.shooter = [x, y]; drag = { type: 'shooter' }; draw(); save(); return; }
    if (tool === 'pillar') { snap(); L.obstacles.push([x, y]); drag = { type: 'pillar', i: L.obstacles.length - 1 }; draw(); save(); return; }
    if (tool === 'tunnel') { drag = { type: 'tunnel', x0: x, y0: y, x1: x, y1: y }; }
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const [x, y] = toW(e);
    const cx = Math.max(0, Math.min(W, x)), cy = Math.max(0, Math.min(H, y));
    if (drag.type === 'pt') { L.paths[drag.pi][drag.i] = [cx, cy]; layerDirty = true; }
    else if (drag.type === 'shooter') L.shooter = [cx, cy];
    else if (drag.type === 'pillar') L.obstacles[drag.i] = [cx, cy];
    else if (drag.type === 'tunnel') { drag.x1 = cx; drag.y1 = cy; }
    draw();
  });
  cv.addEventListener('pointerup', () => {
    if (drag && drag.type === 'tunnel') {
      if (Math.abs(drag.x1 - drag.x0) > 20 && Math.abs(drag.y1 - drag.y0) > 20) { snap(); L.tunnels.push([drag.x0, drag.y0, drag.x1, drag.y1]); layerDirty = true; }
    }
    drag = null; save(); draw();
  });
  window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); $('undo').click(); } });
  window.addEventListener('resize', resize);
  syncForm(); resize();
})();
