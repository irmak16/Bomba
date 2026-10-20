# Kraliyet Zinciri

Zuma tarzı, tarayıcıda çalışan mücevher atma oyunu. Saf HTML5 Canvas + JavaScript, derleme adımı yok.
Masaüstünde fare, telefonda dokunmatik ile oynanır; telefon dik tutulursa oyun alanı otomatik döner.

## Özellikler
- 6 dünya, 30 bölüm, dünya haritası, yıldız sistemi
- Bölüm hedefleri: temizle, altın topla, süre boyunca dayan, patron (Rakun Rüstem) savaşı
- Özel toplar: 🌈 gökkuşağı (her renkle eşleşir), 🧊 buzlu (önce kırılmalı), 🪙 altın
- Güçlendiriciler: ⏳ yavaşlatma, ⏪ geri itme, 💣 bomba, 🎯 nişan dürbünü, 🎨 boya
- Boşluk atışı bonusu, kombolar, "Son Şans" kurtarması
- Çift zincirli bölümler, sabit / dönen / yanıp sönen sütunlar, köprü altı tüneller, ışınlanma kapıları
- Dünyaya özel müzik ve hava efektleri (polen, kıvılcım, ateşböceği, yaprak, kar, yağmur ve şimşek)
- Sonsuz Mod ve her hafta değişen Haftalık Kupa (3. bölümden sonra açılır)
- 7 top görünümü ve 5 kule kostümü (yıldızlarla açılır), 28 başarım, günlük görev, istatistikler
- İlerlemeyi kod ile başka cihaza taşıma (Ayarlar → İlerleme)
- Ayarlar: ses, müzik, titreşim, nişan çizgisi, renk körü modu, büyük toplar, düşük kalite, zorluk
- Bölüm editörü (`editor.html`), çevrimdışı çalışma (PWA)

## Yerelde çalıştırma
- **Mac:** `oyunu-baslat.command` dosyasına çift tıkla (ilk seferde sağ tık → Aç).
- **Elle:** bu klasörde `python3 -m http.server 8000`, sonra `http://localhost:8000`.

Test için tüm bölümleri açmak: adresin sonuna `?dev=1` ekle (`http://localhost:8000/?dev=1`).

## GitHub Pages
1. Bu klasörü bir GitHub deposuna yükle (`index.html` kökte olmalı).
2. Settings → Pages → *Deploy from a branch* → `main` / `root`.
3. Bundan sonra her `git push` siteyi birkaç dakika içinde otomatik günceller.

## Kontroller
| | Masaüstü | Mobil |
|---|---|---|
| Nişan | Fareyi gezdir | Parmağını sürükle |
| Ateş | Sol tık | Parmağını bırak |
| Top değiştir | Sağ tık / Boşluk / topa tıkla | Topa dokun |
| Duraklat | Esc / P | Sol üstteki buton |

## Bölüm editörü
Menüdeki 🛠️ butonu veya `editor.html`. Yol noktalarını tıklayarak çiz, atıcıyı/sütunları yerleştir, köprü kutusu çiz,
**Test Et** ile hemen oyna. **JSON** butonu bölümün kodunu verir; `js/levels.js` içindeki `LEVELS` listesine ekleyerek oyuna kalıcı koyabilirsin.

## Dosyalar
- `js/levels.js` – bölümler, dünyalar, görünümler, güçlendiriciler, hikâye metinleri
- `js/game.js` – oyun çekirdeği · `js/path.js` – yol eğrisi ve çizimi (editörle ortak)
- `js/ui.js` – menü, harita, pencereler · `js/save.js` – kayıt, istatistik, günlük görev
- `js/audio.js` – kodla üretilen ses efektleri ve müzik · `js/editor.js` – bölüm editörü
- `assets/img/` – arka planlar (Gemini; sonbahar/kış/fırtına sürümleri renk işlemesiyle üretildi), atıcı ve sandık (Gemini), toplar/sütun/baykuş/rakun (Blender). Hepsi WebP.
- `tools/` – Blender betikleri (`blender_toplar.py`, `blender_baykus.py`, `blender_ekstra.py`)
- Yazı tipi: Baloo 2 (SIL Open Font License)
