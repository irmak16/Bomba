# Kraliyet Zinciri

Zuma tarzı, tarayıcıda çalışan mücevher atma oyunu. Saf HTML5 Canvas + JavaScript, derleme adımı yok.
Masaüstünde fare, telefonda dokunmatik ile oynanır; telefon dik tutulursa oyun alanı otomatik döner.

## Özellikler
- 3 dünya, 15 bölüm, dünya haritası, yıldız sistemi
- Güçlendiriciler: ⏳ yavaşlatma, ⏪ geri itme, 💣 bomba, 🎯 nişan dürbünü
- Boşluk atışı bonusu, kombolar, çift zincirli bölümler, taş sütun engelleri, köprü altı tüneller
- Sonsuz Mod (3. bölümden sonra açılır), rekor takibi
- Top görünümleri (Klasik, Işıltı, Şeker, Altın) yıldızlarla açılır
- Günlük görev (+2 ⭐), istatistikler, skor paylaşma
- Ayarlar: ses, müzik, titreşim, nişan çizgisi, renk körü modu, büyük toplar, düşük kalite, zorluk
- Bilge Baykuş ile kısa hikâye konuşmaları
- Bölüm editörü (`editor.html`)
- Çevrimdışı çalışır (PWA), "Ana ekrana ekle" ile uygulama gibi açılır

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
- `assets/img/` – arka planlar (Gemini), atıcı ve sandık (Gemini), toplar/sütun/baykuş (Blender)
- `tools/` – Blender betikleri (`blender_toplar.py`, `blender_baykus.py`)
- Yazı tipi: Baloo 2 (SIL Open Font License)
