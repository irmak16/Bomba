// Arayüz: menü, harita, HUD, pencereler, ayarlar, görünümler, istatistik, hikâye, geçişler
(function () {
  const $ = id => document.getElementById(id);
  const S = () => Save.d;
  const fmt = n => Math.round(n).toLocaleString('tr-TR');
  const params = new URLSearchParams(location.search);
  const CUSTOM = params.get('custom') === '1';

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

  let toastT = null;
  function toast(txt) {
    const t = $('toast'); t.textContent = txt; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }
  Save.onDailyDone = (txt, r) => { toast('Günlük görev tamam! +' + r + ' ⭐'); Save.persist(); };

  // ---------- hikâye ----------
  const portrait = $('storyPortrait');
  $('storyImg').onerror = () => portrait.classList.add('fallback');
  function story(key) {
    return new Promise(res => {
      const st = STORY[key];
      if (!st || S().seenStory[key] || CUSTOM) return res();
      S().seenStory[key] = true; Save.persist();
      let i = 0, typing = null;
      const box = $('story'), txt = $('storyText'), btn = $('storyNext');
      const showLine = () => {
        const line = st.lines[i]; let n = 0;
        clearInterval(typing);
        txt.textContent = '';
        typing = setInterval(() => { n += 2; txt.textContent = line.slice(0, n); if (n >= line.length) clearInterval(typing); }, 22);
        btn.textContent = i === st.lines.length - 1 ? 'Başla!' : 'Devam';
      };
      btn.onclick = () => {
        SFX.button();
        if (txt.textContent.length < st.lines[i].length) { clearInterval(typing); txt.textContent = st.lines[i]; return; }
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
  function survivalUnlocked() { return S().unlocked >= 4; }
  function refreshMenu() {
    const b = $('survBtn');
    b.classList.toggle('locked', !survivalUnlocked());
    b.innerHTML = 'Sonsuz Mod' + (survivalUnlocked() ? '' : '<span class="lock-note">🔒 3. bölümden sonra</span>');
    const d = Save.daily();
    const card = $('dailyCard');
    card.classList.toggle('done', d.done);
    card.innerHTML = '<div class="dt">☀️ Günlük Görev · +' + d.reward + ' ⭐</div>' + d.txt +
      '<div class="bar"><i style="width:' + (d.prog / d.n * 100) + '%"></i><b>' + (d.done ? 'Tamamlandı!' : d.prog + ' / ' + d.n) + '</b></div>';
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
      band.style.backgroundImage = 'url(assets/img/' + LEVELS[wd.from].bg + '.jpg)';
      band.innerHTML = '<div class="map-band-title">' + (wi + 1) + '. ' + wd.name + '</div>';
      inner.appendChild(band);
      for (let i = wd.from; i <= wd.to; i++) {
        const j = i - wd.from;
        const y = H - (bottom + 50 + j * gap + gap * 0.4);
        const x = w / 2 + Math.sin(i * 1.15) * Math.min(w * 0.26, 220);
        pts.push([x, y]);
      }
    });
    // yol çizgisi
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
    pts.forEach(([x, y], i) => {
      const locked = i >= S().unlocked, st = S().stars[i] || 0;
      const n = document.createElement('button');
      n.className = 'node' + (locked ? ' locked' : st ? ' done' : '') + (i === cur && !locked ? ' current' : '');
      n.style.left = x + 'px'; n.style.top = y + 'px';
      const side = x < w / 2 ? 'r' : 'l';
      n.innerHTML = (locked ? '🔒' : (i + 1)) +
        (locked ? '' : '<div class="nstars">' + [1, 2, 3].map(k => '<i class="' + (st >= k ? 'on' : '') + '"></i>').join('') + '</div>') +
        '<div class="nname ' + side + '">' + LEVELS[i].name + '</div>';
      if (!locked) n.addEventListener('click', () => { SFX.button(); startLevel(i); });
      inner.appendChild(n);
      if (i === cur && !locked) {
        const av = document.createElement('img');
        av.src = 'assets/img/cannon.png'; av.className = 'map-avatar';
        av.style.left = x + 'px'; av.style.top = (y - 34) + 'px';
        inner.appendChild(av);
      }
    });
    $('mapStars').textContent = Save.totalStars();
    requestAnimationFrame(() => {
      const target = pts[cur] ? pts[cur][1] - window.innerHeight * 0.55 : H;
      $('mapScroll').scrollTop = Math.max(0, target);
    });
  }
  function openMap() { show('map'); buildMap(); }

  // ---------- oyun başlatma ----------
  function levelLabel(i) { return i < 0 ? '' : 'Bölüm ' + (i + 1); }
  function startLevel(i) {
    wipe(() => {
      show(null); hud(true);
      $('hudLevel').textContent = levelLabel(i);
      Game.start(i); Game.pause();
      storyBefore(i).then(() => Game.resume());
      Save.ev('play');
    });
  }
  function startSurvival() {
    wipe(() => { show(null); hud(true); $('hudLevel').textContent = 'Sonsuz · 1'; Game.startSurvival(); Save.ev('play'); });
  }
  function startCustom() {
    let lv = null;
    try { lv = JSON.parse(localStorage.getItem('kz_custom')); } catch (_) { }
    if (!lv || !lv.paths || !lv.paths.length || lv.paths[0].length < 2) { show('menu'); toast('Editörde kayıtlı bölüm yok'); return; }
    show(null); hud(true); $('hudLevel').textContent = 'Deneme';
    Game.startCustom(lv);
  }
  function replay() {
    const k = Game.kind;
    if (k === 'survival') startSurvival();
    else if (k === 'custom') { show(null); startCustom(); }
    else startLevel(Game.levelIdx);
  }

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
    panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
    show('modal');
    if (opts.stars) for (let i = 0; i < opts.stars; i++) setTimeout(() => { stars.children[i].classList.add('on'); SFX.star(i); SFX.vibrate(20); }, 350 + i * 300);
    opts.after && opts.after();
  }
  function closeModal(back) { show(back || null); }

  function countUp(el, to) {
    const t0 = performance.now(), dur = 900;
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }

  function pauseMenu() {
    if (Game.mode !== 'play') return;
    Game.pause();
    const name = Game.kind === 'level' ? LEVELS[Game.levelIdx].name : Game.kind === 'survival' ? 'Sonsuz Mod' : 'Deneme bölümü';
    modal({
      title: 'Duraklatıldı',
      body: '<span class="sub">' + name + '</span>',
      buttons: [
        [{ cls: 'btn btn-green', label: 'Devam Et', fn: () => { show(null); Game.resume(); } }],
        [{ cls: 'btn btn-blue btn-sm', label: 'Yeniden', fn: replay },
         CUSTOM ? { cls: 'btn btn-gold btn-sm', label: 'Editör', fn: () => location.href = 'editor.html' } : { cls: 'btn btn-gold btn-sm', label: 'Harita', fn: () => wipe(() => { hud(false); Game.demo(); openMap(); }) }],
        [{ cls: 'btn btn-blue btn-sm', label: '⚙️ Ayarlar', fn: () => settings(pauseMenuReopen) }]
      ]
    });
  }
  function pauseMenuReopen() { Game.resume(); pauseMenu(); }

  // ---------- ayarlar ----------
  function settings(back) {
    const st = S().settings;
    const rows = [
      ['sound', 'Ses efektleri'], ['music', 'Müzik'], ['vibrate', 'Titreşim', 'Telefonda'],
      ['aim', 'Nişan çizgisi'], ['colorblind', 'Renk körü modu', 'Semboller büyük ve sabit'],
      ['bigBalls', 'Büyük toplar', 'Sonraki bölümde geçerli'], ['lowQuality', 'Düşük kalite', 'Eski telefonlar için']
    ];
    const diff = [['easy', 'Kolay'], ['normal', 'Normal'], ['hard', 'Zor']];
    const body = '<div class="set-list">' +
      rows.map(r => '<div class="set-row"><div>' + r[1] + (r[2] ? '<small>' + r[2] + '</small>' : '') + '</div><button class="switch' + (st[r[0]] ? ' on' : '') + '" data-k="' + r[0] + '" aria-label="' + r[1] + '"></button></div>').join('') +
      '<div class="set-row"><div>Zorluk<small>Hız ve renk sayısı</small></div><div class="seg">' + diff.map(d => '<button data-d="' + d[0] + '" class="' + (st.difficulty === d[0] ? 'on' : '') + '">' + d[1] + '</button>').join('') + '</div></div>' +
      '</div>';
    modal({
      title: 'Ayarlar', body,
      onClose: () => back ? back() : closeModal('menu'),
      after: () => {
        document.querySelectorAll('#modalBody .switch').forEach(sw => sw.addEventListener('click', () => {
          const k = sw.dataset.k; st[k] = !st[k]; sw.classList.toggle('on', st[k]);
          SFX.enabled = st.sound; SFX.vib = st.vibrate; SFX.setMusic(st.music);
          if (k === 'lowQuality' || k === 'colorblind') Game.refresh();
          Save.persist(); SFX.button();
        }));
        document.querySelectorAll('#modalBody .seg button').forEach(b => b.addEventListener('click', () => {
          st.difficulty = b.dataset.d; Save.persist(); SFX.button();
          document.querySelectorAll('#modalBody .seg button').forEach(x => x.classList.toggle('on', x === b));
        }));
      }
    });
  }

  // ---------- görünümler ----------
  function skins() {
    const total = Save.totalStars();
    const body = '<div class="sub" style="margin-bottom:1em">Toplam yıldızın: ⭐ ' + total + '</div><div class="skin-grid">' +
      SKINS.map(s => {
        const un = total >= s.stars, sel = S().skin === s.id;
        return '<button class="skin-card' + (sel ? ' sel' : '') + (un ? '' : ' locked') + '" data-s="' + s.id + '">' +
          '<div class="skin-balls">' + ['red', 'blue', 'yellow'].map(c => '<span><img src="assets/img/balls/' + s.id + '_' + c + '.png" alt=""><img src="assets/img/balls/emblem_' + c + '.png" alt=""></span>').join('') + '</div>' +
          s.name + '<br><span class="req">' + (sel ? '✔ Seçili' : un ? 'Seç' : '🔒 ⭐ ' + s.stars) + '</span></button>';
      }).join('') + '</div>';
    modal({
      title: 'Görünümler', body, onClose: () => closeModal('menu'),
      after: () => document.querySelectorAll('.skin-card').forEach(c => c.addEventListener('click', () => {
        const id = c.dataset.s;
        if (!Save.skinUnlocked(id)) { SFX.warn(); return; }
        S().skin = id; Save.persist(); SFX.button(); skins();
      }))
    });
  }

  // ---------- istatistik ----------
  function stats() {
    const s = S().stats;
    const acc = s.shots ? Math.round(s.popped / s.shots * 100) / 100 : 0;
    const mins = Math.round(s.playTime / 60);
    const items = [
      ['Patlatılan mücevher', fmt(s.popped)], ['Atış', fmt(s.shots)], ['En büyük kombo', 'x' + s.maxCombo],
      ['Kazanılan bölüm', s.wins], ['Kaybedilen', s.losses], ['Boşluk atışı', s.gapShots],
      ['Güçlendirici', s.powers], ['Sonsuz rekor', fmt(S().bestSurvival)], ['Atış başına top', acc], ['Oyun süresi', mins + ' dk']
    ];
    modal({
      title: 'İstatistikler', onClose: () => closeModal('menu'),
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
      if (Game.kind === 'survival') $('hudLevel').textContent = 'Sonsuz · ' + h.survLvl;
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
      const i = Game.levelIdx;
      const prevBest = S().best[i] || 0;
      S().stars[i] = Math.max(S().stars[i] || 0, r.stars);
      S().best[i] = Math.max(prevBest, r.score);
      S().unlocked = Math.max(S().unlocked, Math.min(LEVELS.length, i + 2));
      Save.ev('win', r.stars);
      Save.persist();
      const last = i === LEVELS.length - 1;
      const stars = '⭐'.repeat(r.stars);
      modal({
        title: last ? 'Krallık Kurtuldu!' : 'Tebrikler!',
        stars: r.stars,
        body: '<span class="big" id="scoreCount">0</span><span class="sub">Sandık bonusu +' + r.bonus + (r.score > prevBest && prevBest ? ' · Yeni rekor!' : '') + '</span>',
        buttons: [
          [last ? { cls: 'btn btn-green', label: 'Haritaya Dön', fn: () => wipe(() => { hud(false); Game.demo(); openMap(); story('ending'); }) }
                : { cls: 'btn btn-green', label: 'Sonraki Bölüm', fn: () => startLevel(i + 1) }],
          [{ cls: 'btn btn-blue btn-sm', label: 'Tekrar', fn: replay },
           { cls: 'btn btn-gold btn-sm', label: 'Harita', fn: () => wipe(() => { hud(false); Game.demo(); openMap(); }) },
           { cls: 'round-btn share-btn', label: '📤', aria: 'Paylaş', fn: () => share('Kraliyet Zinciri\'nde ' + (i + 1) + '. bölümü ' + fmt(r.score) + ' puanla bitirdim ' + stars) }]
        ]
      });
      countUp($('scoreCount'), r.score);
    },
    onLose(r) {
      Save.ev('lose');
      if (r.survival) {
        const rec = r.score > S().bestSurvival;
        if (rec) S().bestSurvival = r.score;
        Save.persist();
        modal({
          title: rec ? 'Yeni Rekor!' : 'Oyun Bitti',
          body: '<span class="big">' + fmt(r.score) + '</span><span class="sub">En iyi: ' + fmt(S().bestSurvival) + '</span>',
          buttons: [[{ cls: 'btn btn-green', label: 'Tekrar Dene', fn: replay }],
            [{ cls: 'btn btn-gold btn-sm', label: 'Menü', fn: toMenu }, { cls: 'btn btn-red btn-sm', label: '📤 Paylaş', fn: () => share('Kraliyet Zinciri Sonsuz Mod\'da ' + fmt(r.score) + ' puan yaptım! Geçebilir misin?') }]]
        });
        return;
      }
      Save.persist();
      modal({
        title: 'Hazine Gitti!',
        body: '<span class="sub">Zincir sandığa ulaştı.</span><br><span class="big">' + fmt(r.score) + '</span>',
        buttons: [[{ cls: 'btn btn-green', label: 'Tekrar Dene', fn: replay }],
          [CUSTOM ? { cls: 'btn btn-gold btn-sm', label: 'Editör', fn: () => location.href = 'editor.html' } : { cls: 'btn btn-gold btn-sm', label: 'Harita', fn: () => wipe(() => { hud(false); Game.demo(); openMap(); }) }]]
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
    else if (act === 'survival') { if (survivalUnlocked()) startSurvival(); else toast('3. bölümü bitirince açılır'); }
    else if (act === 'back') wipe(() => { refreshMenu(); show('menu'); });
    else if (act === 'pause') pauseMenu();
    else if (act === 'settings') settings();
    else if (act === 'skins') skins();
    else if (act === 'stats') stats();
    else if (act === 'editor') location.href = 'editor.html';
  });
  // ilk etkileşimde müzik başlasın
  window.addEventListener('pointerdown', () => SFX.unlock(), { once: true });
  window.addEventListener('resize', () => { if ($('map').classList.contains('show')) buildMap(); });
  window.addEventListener('beforeunload', () => Save.persist());
})();
