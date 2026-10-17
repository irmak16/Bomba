// Çevrimdışı çalışma için önbellek. Önce ağdan dener (güncel sürüm), olmazsa önbellekten verir.
const VERSION = 'kz-1792274623';
const FILES = [
  './',
  './assets/fonts/baloo-2-latin-800-normal.woff2',
  './assets/fonts/baloo-2-latin-ext-800-normal.woff2',
  './assets/img/ball_blue.png',
  './assets/img/ball_cyan.png',
  './assets/img/ball_green.png',
  './assets/img/ball_purple.png',
  './assets/img/ball_red.png',
  './assets/img/ball_yellow.png',
  './assets/img/balls/candy_blue.png',
  './assets/img/balls/candy_cyan.png',
  './assets/img/balls/candy_green.png',
  './assets/img/balls/candy_purple.png',
  './assets/img/balls/candy_red.png',
  './assets/img/balls/candy_yellow.png',
  './assets/img/balls/classic_blue.png',
  './assets/img/balls/classic_cyan.png',
  './assets/img/balls/classic_green.png',
  './assets/img/balls/classic_purple.png',
  './assets/img/balls/classic_red.png',
  './assets/img/balls/classic_yellow.png',
  './assets/img/balls/emblem_blue.png',
  './assets/img/balls/emblem_cyan.png',
  './assets/img/balls/emblem_green.png',
  './assets/img/balls/emblem_purple.png',
  './assets/img/balls/emblem_red.png',
  './assets/img/balls/emblem_yellow.png',
  './assets/img/balls/glass_blue.png',
  './assets/img/balls/glass_cyan.png',
  './assets/img/balls/glass_green.png',
  './assets/img/balls/glass_purple.png',
  './assets/img/balls/glass_red.png',
  './assets/img/balls/glass_yellow.png',
  './assets/img/balls/gold_blue.png',
  './assets/img/balls/gold_cyan.png',
  './assets/img/balls/gold_green.png',
  './assets/img/balls/gold_purple.png',
  './assets/img/balls/gold_red.png',
  './assets/img/balls/gold_yellow.png',
  './assets/img/bg1.jpg',
  './assets/img/bg2.jpg',
  './assets/img/bg3.jpg',
  './assets/img/bg4.jpg',
  './assets/img/bg5.jpg',
  './assets/img/bg6.jpg',
  './assets/img/cannon.png',
  './assets/img/chest.png',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/mascot.png',
  './assets/img/pillar.png',
  './css/style.css',
  './editor.html',
  './index.html',
  './js/audio.js',
  './js/editor.js',
  './js/game.js',
  './js/levels.js',
  './js/path.js',
  './js/save.js',
  './js/ui.js',
  './manifest.webmanifest',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
