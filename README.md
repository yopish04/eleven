# ELEVEN — Asia Football

Prototipe simulasi karier pemain dan pelatih untuk arah aplikasi Android. UI web responsif, mesin pertandingan di server, dan progres privat yang tersimpan di database. Terinspirasi aspek karier sosial Football Saga, dengan rancangan dan kode orisinal.

**Demo privat:** https://eleven-asia-yopi.ysalmanhadi.chatgpt.site

Masuk menggunakan akun ChatGPT pemilik Site. Buat nama, klub, dan posisi, lalu pilih latihan dan mainkan pekan. Ganti peran ke **Pelatih** untuk menyimpan formasi dan starting XI.

## Prototipe 0.2 — liga berjenjang dan antarmuka ponsel

- Karier baru dimulai di **Liga Pra-Regional**, kemudian Regional, Nasional, dan Asia Cup.
- Tiap liga domestik berisi 8 klub, 14 pekan kandang–tandang, 56 pertandingan. Dua teratas promosi/tiket Asia; dua terbawah Regional/Nasional terdegradasi. Pra-Regional adalah level terbawah.
- Asia Cup tetap memiliki 32 klub, fase grup, knockout dua leg, final satu laga. Setelah turnamen, kembali ke Nasional untuk kualifikasi berikutnya. Ini siklus karier sederhana, bukan jadwal domestik dan kontinental serentak.
- Pergantian musim ditentukan server. Atribut, statistik karier dan replay tetap tersimpan. Riwayat menyimpan 20 musim terakhir. Lawan baru dibuat per musim; belum ada simulasi persistensi semua klub dunia.
- Karier versi lama tetap dapat dimainkan. Tombol **Mulai Pra-Regional** mengarsipkan musim Asia lama setelah konfirmasi pengguna; tidak menghapus pemain, atribut, statistik atau replay. Reset karier adalah aksi terpisah yang menghapus progres lama.
- Lobi dengan artwork stadion, tombol main utama, navigasi bawah, kartu pemain, ringkasan kondisi dan peta empat jenjang liga. Area terpisah untuk klasemen, jadwal/hasil, riwayat, taktik dan latihan.
- Mesin berbasis peristiwa yang sama, latihan tiap pekan, starting XI, tiga formasi, pressing, kondisi dan kecocokan posisi. Replay 2D dan statistik dapat ditelusuri ke peristiwa laga.
- Penyimpanan server privat per pengguna, transaksi atomik dan pemeriksaan versi agar aksi ganda tidak menggandakan progres.

## Batas prototipe

Belum APK, multiplayer, atau liga/data pemain profesional resmi. Nama klub, nilai atribut, dan aturan piramida adalah skenario fiksi ELEVEN. Artwork beranda tidak menggambarkan gameplay 3D; replay masih berupa ilustrasi 2D posisi formasi/peristiwa.

Belum ada transfer, cedera, kartu, offside, pergantian pemain atau simulasi liga domestik/kontinental paralel. xG dan rating adalah model awal yang belum dikalibrasi terhadap data profesional. Format Asia menyederhanakan fair play dan undian.

## Menjalankan dan menguji

Butuh **Node.js 24+** (pengujian penyimpanan menggunakan `node:sqlite`).

```bash
corepack pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm benchmark
pnpm dev
```

Terapkan migrasi D1 lokal sebelum menggunakan penyimpanan lokal, sesuai konfigurasi database pada `vite.config.ts`. Build produksi memakai `pnpm build`; penerbitan demo saat ini melalui Sites. `.openai/hosting.json` menyimpan identitas Site dan binding `DB`, tidak memuat secret. Untuk membuat deployment independen, provision database baru dan autentikasi tepercaya; jangan menerima header identitas dari klien publik langsung.

Tidak ada akun/password demo bersama, kunci API, atau kredensial dalam repository. Runtime hosted menggunakan identitas dari Sites dispatch. Hak akses demo tetap privat.

## Susunan kode

| Lokasi | Tanggung jawab |
| --- | --- |
| `src/engine.js` | PRNG, pemilihan XI, aksi umpan/duel/tembakan, fatigue, xG, extra time, shootout, reducer statistik |
| `src/world.js` | Klub dan pemain contoh, klasemen head-to-head, knockout, latihan dan taktik |
| `src/career.js` | Piramida liga, jadwal domestik, promosi/degradasi, transisi musim dan arsip karier lama |
| `src/api.js` | Aksi server, isolasi akun, validasi, penyimpanan transaksional dan kontrol versi |
| `app/api/game/route.ts` | Identitas hosted + binding database ke API |
| `app/game.tsx`, `app/mobile.css` | Lobi game mobile, perjalanan liga, latihan dan profil |
| `app/game-components.tsx` | Formasi, taktik, dialog dan replay |
| `db/schema.ts`, `drizzle/` | Skema dan migrasi database |
| `test/` | Pengujian mesin, kompetisi, API, persistensi dan rollback |
| `docs/` | Rancangan statistik, Android/multiplayer dan hasil benchmark |

20 pengujian otomatis memeriksa determinisme, sensitivitas atribut, statistik dari kejadian, susunan tim, latihan, format kompetisi, satu musim penuh, agregat/penalti, isolasi pengguna, versi, dan rollback. Pemeriksaan TypeScript dan build dijalankan. Pengujian juga mencakup liga domestik lengkap, promosi hingga Asia, degradasi, migrasi lama, pergantian musim atomik dan replay historis. Browser QA tidak tersedia di lingkungan ini; belum diuji pada perangkat Android.

## Referensi perilaku

- [Football Saga Fantasista — halaman penerbit Agate di App Store](https://apps.apple.com/id/app/football-saga-fantasista/id1163695375?l=id): karakter, latihan, klub sosial dan strategi.
- [fballers](https://fballers.com/): referensi pemisahan peran pengguna pemain dan manajer dalam satu klub.
- [AFC Champions League Two 2026/27 — peraturan resmi](https://assets.the-afc.com/downloads/tournament-regulations/AFC-Champions-League-Two-2026-27-Competition-Regulations-Jun18upd.pdf): sumber inspirasi struktur kompetisi. ELEVEN tidak berafiliasi dengan AFC.

Dokumentasi rancangan: [Mesin & statistik](docs/ENGINE.md) · [Android & multiplayer](docs/ANDROID.md).
