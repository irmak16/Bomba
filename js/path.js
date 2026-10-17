// Yol yardımcıları: oyun ve bölüm editörü ortak kullanır.
(function () {
  'use strict';

  // Kontrol noktalarından Catmull-Rom eğrisi üretip 2px aralıkla örnekler.
  function buildPath(pts) {
    const P = [pts[0]].concat(pts, [pts[pts.length - 1]]);
    const dense = [];
    for (let i = 1; i < P.length - 2; i++) {
      const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
      for (let t = 0; t < 1; t += 1 / 40) {
        const t2 = t * t, t3 = t2 * t;
        dense.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    dense.push(pts[pts.length - 1]);
    const STEP = 2;
    const xs = [dense[0][0]], ys = [dense[0][1]];
    let acc = 0;
    for (let i = 1; i < dense.length; i++) {
      let ax = dense[i - 1][0], ay = dense[i - 1][1];
      const bx = dense[i][0], by = dense[i][1];
      let seg = Math.hypot(bx - ax, by - ay);
      while (seg > 0 && acc + seg >= STEP) {
        const r = (STEP - acc) / seg;
        ax = ax + (bx - ax) * r; ay = ay + (by - ay) * r;
        xs.push(ax); ys.push(ay);
        seg = Math.hypot(bx - ax, by - ay);
        acc = 0;
      }
      acc += seg;
    }
    if (xs.length < 3) { xs.push(xs[0] + 1, xs[0] + 2); ys.push(ys[0], ys[0]); }
    const n = xs.length;
    return {
      xs, ys, step: STEP, len: (n - 1) * STEP,
      pos(s, out) {
        out = out || {};
        let f = s / STEP; if (f < 0) f = 0; if (f > n - 1) f = n - 1;
        const i = Math.min(n - 2, Math.floor(f)), r = f - i;
        out.x = xs[i] + (xs[i + 1] - xs[i]) * r;
        out.y = ys[i] + (ys[i + 1] - ys[i]) * r;
        return out;
      },
      angle(s) {
        let i = Math.round(s / STEP); i = Math.max(1, Math.min(n - 2, i));
        return Math.atan2(ys[i + 1] - ys[i - 1], xs[i + 1] - xs[i - 1]);
      },
      // kutunun içinde kalan yol aralıklarını [s0,s1] listesi olarak döndürür
      rangesInBox(b) {
        const x0 = Math.min(b[0], b[2]), x1 = Math.max(b[0], b[2]), y0 = Math.min(b[1], b[3]), y1 = Math.max(b[1], b[3]);
        const out = []; let start = -1;
        for (let i = 0; i < n; i++) {
          const inside = xs[i] >= x0 && xs[i] <= x1 && ys[i] >= y0 && ys[i] <= y1;
          if (inside && start < 0) start = i;
          if ((!inside || i === n - 1) && start >= 0) { out.push([start * STEP, (inside ? i : i - 1) * STEP]); start = -1; }
        }
        return out;
      }
    };
  }

  function strokeRange(c, p, s0, s1) {
    const p2 = new Path2D();
    const i0 = Math.max(0, Math.floor(s0 / p.step)), i1 = Math.min(p.xs.length - 1, Math.ceil(s1 / p.step));
    p2.moveTo(p.xs[i0], p.ys[i0]);
    for (let i = i0 + 1; i <= i1; i++) if (i % 2 === 0 || i === i1) p2.lineTo(p.xs[i], p.ys[i]);
    return p2;
  }

  // Taş/altın yol
  function drawTrack(c, p, opts) {
    opts = opts || {};
    const k = (opts.D || 46) / 46;
    const night = !!opts.night;
    const tp = strokeRange(c, p, 0, p.len);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.save();
    c.shadowColor = 'rgba(20,40,10,0.45)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
    c.strokeStyle = '#6b4220'; c.lineWidth = 66 * k; c.stroke(tp);
    c.restore();
    c.strokeStyle = '#8a5a26'; c.lineWidth = 64 * k; c.stroke(tp);
    c.strokeStyle = '#f2c14e'; c.lineWidth = 59 * k; c.stroke(tp);
    c.strokeStyle = '#ffe48a'; c.lineWidth = 55 * k; c.stroke(tp);
    c.strokeStyle = '#b77d2c'; c.lineWidth = 52 * k; c.stroke(tp);
    c.strokeStyle = night ? '#a99c86' : '#d9c39a'; c.lineWidth = 49 * k; c.stroke(tp);
    c.strokeStyle = night ? '#c2b59b' : '#ecdcb6'; c.lineWidth = 38 * k; c.stroke(tp);
    c.strokeStyle = night ? '#cfc3a8' : '#f6ead0'; c.lineWidth = 22 * k; c.stroke(tp);
    c.strokeStyle = 'rgba(140,100,50,0.28)'; c.lineWidth = 2;
    const tmp = {};
    for (let s = 12; s < p.len - 10; s += 26) {
      p.pos(s, tmp);
      const a = p.angle(s) + Math.PI / 2, ca = Math.cos(a) * 23 * k, sa = Math.sin(a) * 23 * k;
      c.beginPath(); c.moveTo(tmp.x - ca, tmp.y - sa); c.lineTo(tmp.x + ca, tmp.y + sa); c.stroke();
    }
    p.pos(0, tmp);
    const g = c.createRadialGradient(tmp.x, tmp.y, 4, tmp.x, tmp.y, 40 * k);
    g.addColorStop(0, 'rgba(30,15,5,0.85)'); g.addColorStop(0.6, 'rgba(30,15,5,0.5)'); g.addColorStop(1, 'rgba(30,15,5,0)');
    c.fillStyle = g; c.beginPath(); c.arc(tmp.x, tmp.y, 40 * k, 0, Math.PI * 2); c.fill();
  }

  // Tünel üstündeki taş köprü
  function drawBridge(c, p, s0, s1, opts) {
    const k = ((opts && opts.D) || 46) / 46;
    const pad = 10;
    const tp = strokeRange(c, p, Math.max(0, s0 - pad), Math.min(p.len, s1 + pad));
    c.save();
    c.lineCap = 'butt'; c.lineJoin = 'round';
    c.shadowColor = 'rgba(20,30,10,0.55)'; c.shadowBlur = 16; c.shadowOffsetY = 8;
    c.strokeStyle = '#5a3a1a'; c.lineWidth = 90 * k; c.stroke(tp);
    c.restore();
    c.save(); c.lineCap = 'butt';
    c.strokeStyle = '#f2c14e'; c.lineWidth = 86 * k; c.stroke(tp);
    c.strokeStyle = '#a77a3a'; c.lineWidth = 80 * k; c.stroke(tp);
    c.strokeStyle = '#e9dcc0'; c.lineWidth = 74 * k; c.stroke(tp);
    c.strokeStyle = '#f7efdc'; c.lineWidth = 40 * k; c.stroke(tp);
    // taş bloklar
    c.strokeStyle = 'rgba(120,90,50,0.35)'; c.lineWidth = 3;
    const tmp = {};
    for (let s = Math.max(0, s0 - pad) + 14; s < Math.min(p.len, s1 + pad) - 6; s += 30) {
      p.pos(s, tmp);
      const a = p.angle(s) + Math.PI / 2, ca = Math.cos(a) * 36 * k, sa = Math.sin(a) * 36 * k;
      c.beginPath(); c.moveTo(tmp.x - ca, tmp.y - sa); c.lineTo(tmp.x + ca, tmp.y + sa); c.stroke();
    }
    // uçlarda koyu kemer gölgesi
    [Math.max(0, s0 - pad), Math.min(p.len, s1 + pad)].forEach(s => {
      p.pos(s, tmp);
      const a = p.angle(s) + Math.PI / 2, ca = Math.cos(a) * 42 * k, sa = Math.sin(a) * 42 * k;
      c.strokeStyle = '#5a3a1a'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(tmp.x - ca, tmp.y - sa); c.lineTo(tmp.x + ca, tmp.y + sa); c.stroke();
    });
    c.restore();
  }

  window.KZPath = { buildPath, drawTrack, drawBridge };
})();
