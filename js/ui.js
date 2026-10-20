// Arayüz: menü, harita, HUD, pencereler, ayarlar, görünümler, başarımlar, istatistik, hikâye, geçişler
(function () {
  const $ = id => document.getElementById(id);
  const S = () => Save.d;
  const fmt = n => Math.round(n).toLocaleString('tr-TR');
  const params = new URLSearchParams(location.search);
  const CUSTOM = params.get('custom') === '1';
  const isBoss = i => LEVELS[i] && LEVELS[i].goal && LEVELS[i].goal.type === 'boss';

  SFX.enabled = S().settings.sound;
  SFX.musicOn = S().settings.music;
  SFX.vib = S().settings.vibrate;

  // ---------- ekranlar ----------
  const screens = ['loading', 'menu', 'map', 'modal'];
  function show(id) { screens.forEach(s => $(s).classList.toggle('show', s === id)); }
  function hud(on) { $('hud').classList.toggle('show', on); }

  function wipe(fn) {
    const w = $('wipe');
    w.classList.add('on');
    setTimeout(() => { fn(); setTimeout(() => w.classList.remove('on'), 60); }, 400);
  }

  // bildirimler sırayla gösterilir
  const toastQ = []; let toastBusy = false;
  function toast(txt) { toastQ.push(txt); if (!toastBusy) nextToast(); }
  function nextToast() {
    const txt = toastQ.shift();
    if (!txt) { toastBusy = false; return; }
    toastBusy = true;
    const t = $('toast'); t.textContent = txt; t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); setTimeout(nextToast, 350); }, 2400);
  }
  Save.onDailyDone = (txt, r) => { toast('☀️ Günlük görev tamam! +' + r + ' ⭐'); Save.persist(); };
  Save.onAch = a => { toast('🏆 Başarım: ' + a.icon + ' ' + a.name); SFX.star(2); Save.persist(); };

  // ---------- hikâye ----------
  const SPEAKERS = { o: { name: 'Bilge Baykuş', img: 'assets/img/mascot.webp', cls: '' }, r: { name: 'Rakun Rüstem', img: 'assets/img/raccoon.webp', cls: 'villain' } };
  const portrait = $('storyPortrait');
  $('storyImg').onerror = () => portrait.classList.add('fallback');
  function story(key) {
    return new Promise(res => {
      const st = STORY[key];
      if (!st || S().seenStory[key] || CUSTOM) return res();
      S().seenStory[key] = true; Save.persist();
      let i = 0, typing = null;
      const box = $('story'), txt = $('storyText'), btn = $('storyNext');
      const lineOf = l => Array.isArray(l) ? l : ['o', l];
      const showLine = () => {
        const [who, line] = lineOf(st.lines[i]);
        const sp = SPEAKERS[who] || SPEAKERS.o;
        portrait.classList.remove('fallback');
        if (!$('storyImg').src.endsWith(sp.img)) $('storyImg').src = sp.img;
        $('storyName').textContent = sp.name;
        box.classList.toggle('villain', who === 'r');
        $('storyBox').style.animation = 'none'; void $('storyBox').offsetWidth; $('storyBox').style.animation = '';
        let n = 0;
        clearInterval(typing);
        txt.textContent = '';
        typing = setInterval(() => { n += 2; txt.textContent = line.slice(0, n); if (n >= line.length) clearInterval(typing); }, 22);
        btn.textContent = i === st.lines.length - 1 ? 'Başla!' : 'Devam';
      };
      btn.onclick = () => {
        SFX.button();
        const line = lineOf(st.lines[i])[1];
        if (txt.textContent.length < line.length) { clearInterval(typing); txt.textContent = line; return; }
        i++;
        if (i >= st.lines.length) { box.classList.remove('show'); res(); } else showLine();
      };
      box.classList.add('show'); showLine();
    });
  }
  function storyBefore(idx) {
    const k = Object.keys(STORY).find(k => STORY[k].before === idx);
    return k ? story(k) : Promise.resolve();
  }

  // ---------- menü ----------
  const modesUnlocked = () => S().unlocked >= 4;
  function refreshMenu() {
    ['survBtn', 'weeklyBtn'].forEach(id => {
      const b = $(id);
      b.classList.toggle('locked', !modesUnlocked());
      b.querySelector('.lock-note').style.display = modesUnlocked() ? 'none' : '';
    });
    const w = Save.weekly();
    $('weeklyBest').textContent = w.best ? 'Rekor: ' + fmt(w.best) : 'Bu hafta yeni!';
    const d = Save.daily();
    const card = $('dailyCard');
    card.classList.toggle('done', d.done);
    card.innerHTML = '<div class="dt">☀️ Günlük Görev · +' + d.reward + ' ⭐</div>' + d.txt +
      '<div class="bar"><i style="width:' + (d.prog / d.n * 100) + '%"></i><b>' + (d.done ? 'Tamamlandı!' : d.prog + ' / ' + d.n) + '</b></div>';
    const nAch = Object.keys(S().ach).length;
    $('achBadge').textContent = nAch;
  }
  function toMenu() {
    wipe(() => { hud(false); Game.demo(); refreshMenu(); show('menu'); });
  }

  // ---------- harita ----------
  function currentLevel() {
    for (let i = 0; i < LEVELS.length; i++) if (!S().stars[i] && i < S().unlocked) return i;
    return Math.min(S().unlocked, LEVELS.length) - 1;
  }
  function buildMap() {
    const inner = $('mapInner');
    inner.innerHTML = '';
    const w = inner.clientWidth || window.innerWidth;
    const gap = Math.max(110, Math.min(150, window.innerHeight / 5.5));
    const bandH = gap * 5 + 60;
    const topPad = 140, botPad = 30;
    const H = topPad + bandH * WORLDS.length + botPad;
    inner.style.height = H + 'px';
    const pts = [];
    WORLDS.forEach((wd, wi) => {
      const band = document.createElement('div');
      band.className = 'map-band';
      const bottom = botPad + wi * bandH;
      band.style.bottom = bottom + 'px'; band.style.height = bandH + 'px';
      band.style.backgroundImage = 'url(assets/img/' + wd.bg + '.webp)';
      band.innerHTML = '<div class="map-band-title">' + (wi + 1) + '. ' + wd.name + '</div>';
      inner.appendChild(band);
      for (let i = wd.from; i <= wd.to; i++) {
        const j = i - wd.from;
        const y = H - (bottom + 50 + j * gap + gap * 0.4);
        const x = w / 2 + Math.sin(i * 1.15) * Math.min(w * 0.26, 220);
        pts.push([x, y]);
      }
    });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'map-svg'); svg.setAttribute('width', w); svg.setAttribute('height', H);
    let d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i], my = (p0[1] + p1[1]) / 2;
      d += ' C' + p0[0] + ' ' + my + ' ' + p1[0] + ' ' + my + ' ' + p1[0] + ' ' + p1[1];
    }
    [['#6b3f12', 22], ['#f2d9a0', 16]].forEach(([c, sw], k) => {
      const p = document.createElementNS(svgNS, 'path');
      p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', c); p.setAttribute('stroke-width', sw);
      p.setAttribute('stroke-linecap', 'round');
      if (k === 1) p.setAttribute('stroke-dasharray', '2 18');
      svg.appendChild(p);
    });
    inner.appendChild(svg);
    const cur = currentLevel();
    const seen = S().mapSeen || 1;
    let freshCount = 0;
    pts.forEach(([x, y], i) => {
      const locked = i >= S().unlocked, st = S().stars[i] || 0;
      const fresh = !locked && i >= seen && !Save.DEV;
      const n = document.createElement('button');
      n.className = 'node' + (locked ? ' locked' : st ? ' done' : '') + (i === cur && !locked ? ' current' : '') + (isBoss(i) ? ' boss' : '') + (fresh ? ' fresh' : '');
      if (fresh) { n.style.animationDelay = (0.5 + freshCount * 0.25) + 's'; freshCount++; }
      n.style.left = x + 'px'; n.style.top = y + 'px';
      const side = x < w / 2 ? 'r' : 'l';
      const g = LEVELS[i].goal ? LEVELS[i].goal.type : 'clear';
      const tag = { boss: '🦝', gold: '🪙', survive: '⏱' }[g] || '';
      n.innerHTML = (locked ? '🔒' : (i + 1)) +
        (tag ? '<span class="ntag">' + tag + '</span>' : '') +
        (locked ? '' : '<div class="nstars">' + [1, 2, 3].map(k => '<i class="' + (st >= k ? 'on' : '') + '"></i>').join('') + '</div>') +
        '<div class="nname ' + side + '">' + LEVELS[i].name + '</div>';
      if (!locked) n.addEventListener('click', () => { SFX.button(); startLevel(i); });
      inner.appendChild(n);
      if (i === cur && !locked) {
        const av = document.createElement('img');
        av.src = 'assets/img/' + (CANNONS.find(c => c.id === S().cannon) || CANNONS[0]).file + '.webp'; av.className = 'map-avatar';
        av.style.left = x + 'px'; av.style.top = (y - 34) + 'px';
        inner.appendChild(av);
      }
    });
    if (freshCount) { setTimeout(() => SFX.star(1), 500); S().mapSeen = S().unlocked; Save.persist(); }
    $('mapStars').textContent = Save.totalStars();
    requestAnimationFrame(() => {
      const target = pts[cur] ? pts[cur][1] - window.innerHeight * 0.55 : H;
      $('mapScroll').scrollTop = Math.max(0, target);
    });
  }
  function openMap() { show('map'); buildMap(); }

  // ---------- oyun başlatma ----------
  let hudFull = '';
  function setHudLevel(t) {
    hudFull = t;
    const short = t.replace('Bölüm ', '').replace('Sonsuz · ', '♾️ ').replace('🏆 Haftalık', '🏆').replace('Deneme', '🧪');
    $('hudLevel').textContent = document.body.classList.contains('portrait') ? short : t;
  }
  window.addEventListener('resize', () => setTimeout(() => setHudLevel(hudFull), 50));
  function startLevel(i) {
    wipe(() => {
      show(null); hud(true);
      setHudLevel('Bölüm ' + (i + 1));
      Game.start(i); Game.pause();
      storyBefore(i).then(() => Game.resume());
      Save.ev('play');
    });
  }
  function startSurvival() {
    wipe(() => { show(null); hud(true); setHudLevel('Sonsuz · 1'); Game.startSurvival(); Save.ev('play'); });
  }
  function weeklyLevel() {
    const w = Save.weekly();
    let h = 0; for (const ch of w.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const base = WEEKLY_POOL[h % WEEKLY_POOL.length];
    const bgs = ['bg1', 'bg3', 'bg5', 'bg7', 'bg9', 'bg11'];
    return Object.assign({ name: 'Haftalık Kupa', bg: bgs[(h >> 4) % bgs.length], colors: 5, speed: 33, pw: 0.08, special: { ice: 0.04, joker: 0.02, gold: 0.04 }, goal: { type: 'survive', t: 120 }, theme: (h >> 4) % 6 }, base);
  }
  function startWeekly() {
    wipe(() => {
      show(null); hud(true); setHudLevel('🏆 Haftalık');
      Game.startWeekly(weeklyLevel());
      Save.weekly().plays++; Save.ev('weekly'); Save.ev('play'); Save.persist();
    });
  }
  function startCustom() {
    let lv = null;
    try { lv = JSON.parse(localStorage.getItem('kz_custom')); } catch (_) { }
    if (!lv || !lv.paths || !lv.paths.length || lv.paths[0].length < 2) { show('menu'); toast('Editörde kayıtlı bölüm yok'); return; }
    show(null); hud(true); setHudLevel('Deneme');
    Game.startCustom(lv);
  }
  function replay() {
    const k = Game.kind;
    if (k === 'survival') startSurvival();
    else if (k === 'weekly') startWeekly();
    else if (k === 'custom') { show(null); startCustom(); }
    else startLevel(Game.levelIdx);
  }
  const toMap = () => wipe(() => { hud(false); Game.demo(); openMap(); });

  // ---------- pencere ----------
  function modal(opts) {
    $('modalTitle').textContent = opts.title;
    const stars = $('modalStars');
    stars.classList.toggle('hidden', opts.stars === undefined);
    stars.querySelectorAll('.star').forEach(s => s.classList.remove('on'));
    $('modalBody').innerHTML = opts.body || '';
    const close = $('modalClose');
    close.classList.toggle('show', !!opts.onClose);
    close.onclick = () => { SFX.button(); opts.onClose && opts.onClose(); };
    const box = $('modalButtons');
    box.innerHTML = '';
    (opts.buttons || []).forEach(row => {
      const r = document.createElement('div'); r.className = 'row';
      row.forEach(b => {
        const el = document.createElement('button');
        el.className = b.cls; el.innerHTML = b.label || '';
        if (b.aria) el.setAttribute('aria-label', b.aria);
        el.addEventListener('click', () => { SFX.button(); b.fn && b.fn(el); });
        r.appendChild(el);
      });
      box.appendChild(r);
    });
    const panel = $('modalPanel');
    panel.classList.toggle('wide', !!opts.wide);
    panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
    show('modal');
    if (opts.stars) for (let i = 0; i < opts.stars; i++) setTimeout(() => { stars.children[i].classList.add('on'); SFX.star(i); SFX.vibrate(20); }, 350 + i * 300);
    opts.after && opts.after();
  }
  function closeModal(back) { show(back || null); if (back === 'menu') refreshMenu(); }

  function countUp(el, to) {
    const t0 = performance.now(), dur = 900;
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }

  function kindName() {
    const k = Game.kind;
    return k === 'level' ? LEVELS[Game.levelIdx].name : k === 'survival' ? 'Sonsuz Mod' : k === 'weekly' ? 'Haftalık Kupa' : 'Deneme bölümü';
  }
  function pauseMenu() {
    if (Game.mode !== 'play') return;
    Game.pause();
    const lv = Game.kind === 'level' ? LEVELS[Game.levelIdx] : null;
    const goal = lv && lv.goal ? '<br><span class="sub">🎯 ' + GOAL_TEXT[lv.goal.type](lv.goal) + '</span>' : '';
    modal({
      title: 'Duraklatıldı',
      body: '<span class="sub">' + kindName() + '</span>' + goal,
      buttons: [
        [{ cls: 'btn btn-green', label: 'Devam Et', fn: () => { show(null); Game.resume(); } }],
        [{ cls: 'btn btn-blue btn-sm', label: 'Yeniden', fn: replay },
         CUSTOM ? { cls: 'btn btn-gold btn-sm', label: 'Editör', fn: () => location.href = 'editor.html' } : { cls: 'btn btn-gold btn-sm', label: Game.kind === 'level' ? 'Harita' : 'Menü', fn: () => Game.kind === 'level' ? toMap() : toMenu() }],
        [{ cls: 'btn btn-blue btn-sm', label: '⚙️ Ayarlar', fn: () => settings(pauseMenuReopen) }]
      ]
    });
  }
  function pauseMenuReopen() { Game.resume(); pauseMenu(); }

  // ---------- ayarlar ----------
  function settings(back) {
    const st = S().settings;
    const rows = [
      ['sound', 'Ses efektleri'], ['music', 'Müzik'], ['vibrate', 'Titreşim', 'Android telefonlarda'],
      ['aim', 'Nişan çizgisi'], ['colorblind', 'Renk körü modu', 'Semboller büyük ve sabit'],
      ['bigBalls', 'Büyük toplar', 'Sonraki bölümde geçerli'], ['lowQuality', 'Düşük kalite', 'Eski telefonlar için']
    ];
    const diff = [['easy', 'Kolay'], ['normal', 'Normal'], ['hard', 'Zor']];
    const body = '<div class="set-list">' +
      rows.map(r => '<div class="set-row"><div>' + r[1] + (r[2] ? '<small>' + r[2] + '</small>' : '') + '</div><button class="switch' + (st[r[0]] ? ' on' : '') + '" data-k="' + r[0] + '" aria-label="' + r[1] + '"></button></div>').join('') +
      '<div class="set-row"><div>Zorluk<small>Hız ve renk sayısı</small></div><div class="seg">' + diff.map(d => '<button data-d="' + d[0] + '" class="' + (st.difficulty === d[0] ? 'on' : '') + '">' + d[1] + '</button>').join('') + '</div></div>' +
      '<div class="set-row"><div>İlerleme<small>Başka cihaza taşımak için</small></div><div class="seg"><button data-x="export">Kodu al</button><button data-x="import">Kod gir</button></div></div>' +
      '</div>';
    modal({
      title: 'Ayarlar', body, wide: true,
      onClose: () => back ? back() : closeModal('menu'),
      after: () => {
        document.querySelectorAll('#modalBody .switch').forEach(sw => sw.addEventListener('click', () => {
          const k = sw.dataset.k; st[k] = !st[k]; sw.classList.toggle('on', st[k]);
          SFX.enabled = st.sound; SFX.vib = st.vibrate; SFX.setMusic(st.music);
          if (k === 'lowQuality' || k === 'colorblind') Game.refresh();
          Save.persist(); SFX.button();
        }));
        document.querySelectorAll('#modalBody .seg button[data-d]').forEach(b => b.addEventListener('click', () => {
          st.difficulty = b.dataset.d; Save.persist(); SFX.button();
          document.querySelectorAll('#modalBody .seg button[data-d]').forEach(x => x.classList.toggle('on', x === b));
        }));
        document.querySelectorAll('#modalBody [data-x]').forEach(b => b.addEventListener('click', () => {
          SFX.button(); transfer(b.dataset.x, () => settings(back));
        }));
      }
    });
  }
  function transfer(mode, back) {
    const exp = mode === 'export';
    modal({
      title: exp ? 'İlerleme Kodu' : 'Kod ile Yükle',
      body: '<div class="sub" style="margin-bottom:.6em">' + (exp ? 'Bu kodu kopyalayıp diğer cihazda "Kod gir" ile yapıştır.' : 'Diğer cihazdan aldığın kodu yapıştır. Bu cihazdaki ilerlemenin yerine geçer.') + '</div>' +
        '<textarea id="xferText" class="xfer" spellcheck="false"' + (exp ? ' readonly' : '') + '>' + (exp ? Save.exportCode() : '') + '</textarea>',
      onClose: back,
      buttons: [[exp ? { cls: 'btn btn-green btn-sm', label: 'Kopyala', fn: () => {
        const t = $('xferText'); t.select();
        (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Kopyalandı!'), () => { document.execCommand && document.execCommand('copy'); toast('Kopyalandı!'); });
      } } : { cls: 'btn btn-green btn-sm', label: 'Yükle', fn: () => {
        try { Save.importCode($('xferText').value); toast('İlerleme yüklendi!'); setTimeout(() => location.reload(), 900); }
        catch (_) { toast('Kod geçersiz'); }
      } }]]
    });
  }

  // ---------- görünümler ----------
  function skins(tab) {
    tab = tab || 'balls';
    const total = Save.totalStars();
    const tabs = '<div class="seg tabs"><button data-t="balls" class="' + (tab === 'balls' ? 'on' : '') + '">Toplar</button><button data-t="cannon" class="' + (tab === 'cannon' ? 'on' : '') + '">Kule</button></div>';
    let grid;
    if (tab === 'balls') {
      grid = SKINS.map(s => {
        const un = total >= s.stars, sel = S().skin === s.id;
        return '<button class="skin-card' + (sel ? ' sel' : '') + (un ? '' : ' locked') + '" data-s="' + s.id + '">' +
          '<div class="skin-balls">' + ['red', 'blue', 'yellow'].map(c => '<span><img src="assets/img/balls/' + s.id + '_' + c + '.webp" alt=""><img src="assets/img/balls/emblem_' + c + '.webp" alt=""></span>').join('') + '</div>' +
          s.name + '<br><span class="req">' + (sel ? '✔ Seçili' : un ? 'Seç' : '🔒 ⭐ ' + s.stars) + '</span></button>';
      }).join('');
    } else {
      grid = CANNONS.map(c => {
        const un = total >= c.stars, sel = S().cannon === c.id;
        return '<button class="skin-card' + (sel ? ' sel' : '') + (un ? '' : ' locked') + '" data-c="' + c.id + '">' +
          '<img class="cannon-prev" src="assets/img/' + c.file + '.webp" alt="">' +
          c.name + '<br><span class="req">' + (sel ? '✔ Seçili' : un ? 'Seç' : '🔒 ⭐ ' + c.stars) + '</span></button>';
      }).join('');
    }
    modal({
      title: 'Görünümler', wide: true,
      body: tabs + '<div class="sub" style="margin:.6em 0">Toplam yıldızın: ⭐ ' + total + '</div><div class="skin-grid">' + grid + '</div>',
      onClose: () => closeModal('menu'),
      after: () => {
        document.querySelectorAll('#modalBody [data-t]').forEach(b => b.addEventListener('click', () => { SFX.button(); skins(b.dataset.t); }));
        document.querySelectorAll('.skin-card').forEach(c => c.addEventListener('click', () => {
          if (c.dataset.s) { if (!Save.skinUnlocked(c.dataset.s)) { SFX.warn(); return; } S().skin = c.dataset.s; }
          else { if (!Save.cannonUnlocked(c.dataset.c)) { SFX.warn(); return; } S().cannon = c.dataset.c; }
          Save.persist(); Save.checkAch(); SFX.button(); skins(tab);
        }));
      }
    });
  }

  // ---------- başarımlar ----------
  function achievements() {
    const got = S().ach;
    const n = Object.keys(got).length;
    modal({
      title: 'Başarımlar', wide: true,
      body: '<div class="sub" style="margin-bottom:.8em">' + n + ' / ' + Save.ACH.length + ' açıldı</div><div class="ach-grid">' +
        Save.ACH.map(a => '<div class="ach' + (got[a.id] ? ' on' : '') + '"><div class="ach-ico">' + (got[a.id] ? a.icon : '🔒') + '</div><b>' + a.name + '</b><small>' + a.desc + '</small></div>').join('') + '</div>',
      onClose: () => closeModal('menu')
    });
  }

  // ---------- istatistik ----------
  function stats() {
    const s = S().stats;
    const acc = s.shots ? Math.round(s.popped / s.shots * 100) / 100 : 0;
    const items = [
      ['Patlatılan mücevher', fmt(s.popped)], ['Atış', fmt(s.shots)], ['En büyük kombo', 'x' + s.maxCombo],
      ['Kazanılan bölüm', s.wins], ['Kaybedilen', s.losses], ['Boşluk atışı', s.gapShots],
      ['Güçlendirici', s.powers], ['Kırılan buz', s.ice], ['Toplanan altın', s.gold],
      ['Yenilen patron', s.bosses], ['Tek atış rekoru', s.bestShot], ['Kusursuz bölüm', s.perfect],
      ['Sonsuz rekor', fmt(S().bestSurvival)], ['Atış başına top', acc], ['Oyun süresi', Math.round(s.playTime / 60) + ' dk']
    ];
    modal({
      title: 'İstatistikler', onClose: () => closeModal('menu'), wide: true,
      body: '<div class="stat-grid">' + items.map(i => '<div class="stat"><b>' + i[1] + '</b>' + i[0] + '</div>').join('') + '</div>'
    });
  }

  // ---------- paylaşma ----------
  function share(text) {
    const url = location.href.split('?')[0].split('#')[0];
    if (navigator.share) { navigator.share({ title: 'Kraliyet Zinciri', text, url }).catch(() => { }); return; }
    const full = text + ' ' + url;
    if (navigator.clipboard) navigator.clipboard.writeText(full).then(() => toast('Panoya kopyalandı!'), () => toast(full));
    else toast(full);
  }

  // ---------- oyun geri çağrıları ----------
  Game.init({
    onReady() {
      refreshMenu();
      if (CUSTOM) { startCustom(); return; }
      show('menu');
    },
    onHud(h) {
      $('hudScore').textContent = fmt(h.score);
      $('hudProg').style.width = (h.progress * 100).toFixed(1) + '%';
      $('hud').classList.toggle('danger', h.danger > 0.8);
      const g = $('hudGoal');
      g.textContent = h.goalTxt; g.style.display = h.goalTxt ? '' : 'none';
      if (Game.kind === 'survival') setHudLevel('Sonsuz · ' + h.survLvl);
    },
    onPauseKey() { pauseMenu(); },
    onWin(r) {
      if (r.kind === 'custom') {
        modal({
          title: 'Bölüm Bitti!', stars: r.stars, body: '<span class="big">' + fmt(r.score) + '</span>',
          buttons: [[{ cls: 'btn btn-green', label: 'Editöre Dön', fn: () => location.href = 'editor.html' }], [{ cls: 'btn btn-blue btn-sm', label: 'Tekrar', fn: replay }]]
        });
        return;
      }
      if (r.kind === 'weekly') {
        const w = Save.weekly(); const rec = r.score > w.best; if (rec) w.best = r.score;
        Save.ev('win', { stars: 0, misses: r.misses, lastChance: r.lastChance }); Save.persist();
        modal({
          title: rec ? 'Haftalık Rekor!' : 'Kupa Turu Bitti',
          body: '<span class="big" id="scoreCount">0</span><span class="sub">Bu haftaki en iyin: ' + fmt(w.best) + '</span>',
          buttons: [[{ cls: 'btn btn-green', label: 'Tekrar Dene', fn: replay }],
            [{ cls: 'btn btn-gold btn-sm', label: 'Menü', fn: toMenu }, { cls: 'round-btn share-btn', label: '📤', aria: 'Paylaş', fn: () => share('Kraliyet Zinciri Haftalık Kupa\'da ' + fmt(r.score) + ' puan yaptım! Geçebilir misin?') }]]
        });
        countUp($('scoreCount'), r.score);
        return;
      }
      const i = Game.levelIdx;
      const prevBest = S().best[i] || 0;
      S().stars[i] = Math.max(S().stars[i] || 0, r.stars);
      S().best[i] = Math.max(prevBest, r.score);
      S().unlocked = Math.max(S().unlocked, Math.min(LEVELS.length, i + 2));
      Save.ev('win', { stars: r.stars, misses: r.misses, lastChance: r.lastChance });
      Save.persist();
      const last = i === LEVELS.length - 1;
      const stars = '⭐'.repeat(r.stars);
      const extra = [];
      if (!r.misses) extra.push('🎯 Kusursuz!');
      if (r.score > prevBest && prevBest) extra.push('Yeni rekor!');
      modal({
        title: last ? 'Krallık Kurtuldu!' : r.goal === 'boss' ? 'Zafer!' : 'Tebrikler!',
        stars: r.stars,
        body: '<span class="big" id="scoreCount">0</span><span class="sub">Sandık bonusu +' + r.bonus + (extra.length ? ' · ' + extra.join(' · ') : '') + '</span>',
        buttons: [
          [last ? { cls: 'btn btn-green', label: 'Haritaya Dön', fn: () => wipe(() => { hud(false); Game.demo(); openMap(); story('ending'); }) }
                : { cls: 'btn btn-green', label: 'Sonraki Bölüm', fn: () => startLevel(i + 1) }],
          [{ cls: 'btn btn-blue btn-sm', label: 'Tekrar', fn: replay },
           { cls: 'btn btn-gold btn-sm', label: 'Harita', fn: toMap },
           { cls: 'round-btn share-btn', label: '📤', aria: 'Paylaş', fn: () => share('Kraliyet Zinciri\'nde ' + (i + 1) + '. bölümü ' + fmt(r.score) + ' puanla bitirdim ' + stars) }]
        ]
      });
      countUp($('scoreCount'), r.score);
    },
    onLose(r) {
      Save.ev('lose');
      if (r.survival || r.kind === 'weekly') {
        let best, rec;
        if (r.survival) { rec = r.score > S().bestSurvival; if (rec) S().bestSurvival = r.score; best = S().bestSurvival; }
        else { const w = Save.weekly(); rec = r.score > w.best; if (rec) w.best = r.score; best = w.best; }
        Save.checkAch(); Save.persist();
        modal({
          title: rec ? 'Yeni Rekor!' : 'Oyun Bitti',
          body: '<span class="big">' + fmt(r.score) + '</span><span class="sub">En iyi: ' + fmt(best) + '</span>',
          buttons: [[{ cls: 'btn btn-green', label: 'Tekrar Dene', fn: replay }],
            [{ cls: 'btn btn-gold btn-sm', label: 'Menü', fn: toMenu }, { cls: 'round-btn share-btn', label: '📤', aria: 'Paylaş', fn: () => share('Kraliyet Zinciri ' + (r.survival ? 'Sonsuz Mod' : 'Haftalık Kupa') + '\'da ' + fmt(r.score) + ' puan yaptım! Geçebilir misin?') }]]
        });
        return;
      }
      Save.persist();
      modal({
        title: 'Hazine Gitti!',
        body: '<span class="sub">Zincir sandığa ulaştı.</span><br><span class="big">' + fmt(r.score) + '</span>',
        buttons: [[{ cls: 'btn btn-green', label: 'Tekrar Dene', fn: replay }],
          [CUSTOM ? { cls: 'btn btn-gold btn-sm', label: 'Editör', fn: () => location.href = 'editor.html' } : { cls: 'btn btn-gold btn-sm', label: 'Harita', fn: toMap }]]
      });
    }
  });

  // ---------- statik butonlar ----------
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    SFX.unlock();
    SFX.button();
    if (act === 'play') wipe(openMap);
    else if (act === 'survival') { if (modesUnlocked()) startSurvival(); else toast('3. bölümü bitirince açılır'); }
    else if (act === 'weekly') { if (modesUnlocked()) startWeekly(); else toast('3. bölümü bitirince açılır'); }
    else if (act === 'back') wipe(() => { refreshMenu(); show('menu'); });
    else if (act === 'pause') pauseMenu();
    else if (act === 'settings') settings();
    else if (act === 'skins') skins();
    else if (act === 'stats') stats();
    else if (act === 'ach') achievements();
    else if (act === 'editor') location.href = 'editor.html';
  });
  window.addEventListener('pointerdown', () => SFX.unlock(), { once: true });
  window.addEventListener('resize', () => { if ($('map').classList.contains('show')) buildMap(); });
  window.addEventListener('beforeunload', () => Save.persist());
  window.KZUI = { story, toast };
})();
