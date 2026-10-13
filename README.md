# ELEVEN — Asia Football

Prototipe simulasi karier pemain dan pelatih untuk arah aplikasi Android. UI web responsif, mesin pertandingan di server, dan progres privat yang tersimpan di database. Terinspirasi aspek karier sosial Football Saga, dengan rancangan dan kode orisinal.

**Demo privat:** https://eleven-asia-yopi.ysalmanhadi.chatgpt.site

Masuk menggunakan akun ChatGPT pemilik Site. Buat nama, klub, dan posisi, lalu pilih latihan dan mainkan pekan. Ganti peran ke **Pelatih** untuk menyimpan formasi dan starting XI.

## Sudah dapat dimainkan

- Karakter pemain di satu dari 32 klub fiksi Asia, 16 pemain per klub.
- Latihan sekali setiap pekan, perkembangan atribut, kondisi dan pemulihan.
- Peran pemain/pelatih dapat ditukar di demo; susunan 11 pemain dan tiga formasi.
- Mentalitas, gaya umpan, pressing, kondisi, stamina dan kecocokan posisi memengaruhi aksi.
- 8 grup, kandang–tandang, dua klub lolos per grup, knockout dua leg, final satu laga. Satu musim selesai dalam 13 pekan / 125 pertandingan.
- Perpanjangan waktu dan penalti pada agregat imbang; gol penalti tidak mencemari statistik laga.
- Replay 2D dengan kontrol waktu, statistik tim/pemain, dan unduhan catatan pertandingan JSON.
- Progres server per pengguna, penyimpanan atomik hasil + statistik, pemeriksaan versi untuk mencegah pembaruan ganda.

## Batas prototipe

Ini **belum APK**, belum multiplayer, dan belum berisi pemain profesional berlisensi. Lawan otomatis dan identitas klub/pemain adalah data contoh. Setiap akun menjalankan dunia demo sendiri. Pergantian peran hanya untuk mencoba dua pengalaman, bukan otorisasi multi-pengguna produksi.

Mesin memodelkan peristiwa abstrak, bukan fisika bola dan tracking pemain. xG dan rating adalah model awal ELEVEN, belum dikalibrasi terhadap data profesional. Animasi lapangan menunjukkan ilustrasi formasi/peristiwa. Belum ada cedera, kartu, offside, bola mati khusus, pergantian pemain, transfer, liga domestik, atau musim lanjutan otomatis. Aturan penentu grup menyederhanakan fair play/penalti khusus menjadi undian deterministik setelah kriteria olahraga; bracket sudah ditetapkan, bukan undian resmi AFC.

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
| `src/world.js` | Klub dan pemain contoh, jadwal, klasemen head-to-head, knockout, latihan dan taktik |
| `src/api.js` | Aksi server, isolasi akun, validasi, penyimpanan transaksional dan kontrol versi |
| `app/api/game/route.ts` | Identitas hosted + binding database ke API |
| `app/game.tsx` | UI ponsel/desktop, dua peran, replay dan form |
| `db/schema.ts`, `drizzle/` | Skema dan migrasi database |
| `test/` | Pengujian mesin, kompetisi, API, persistensi dan rollback |
| `docs/` | Rancangan statistik, Android/multiplayer dan hasil benchmark |

14 pengujian otomatis memeriksa determinisme, sensitivitas atribut, statistik dari kejadian, susunan tim, latihan, format kompetisi, satu musim penuh, agregat/penalti, isolasi pengguna, versi, dan rollback. Pemeriksaan TypeScript dan build dijalankan. Verifikasi visual melalui browser tidak tersedia pada lingkungan pembuatan ini.

## Referensi perilaku

- [Football Saga Fantasista — halaman penerbit Agate di App Store](https://apps.apple.com/id/app/football-saga-fantasista/id1163695375?l=id): karakter, latihan, klub sosial dan strategi.
- [fballers](https://fballers.com/): referensi pemisahan peran pengguna pemain dan manajer dalam satu klub.
- [AFC Champions League Two 2026/27 — peraturan resmi](https://assets.the-afc.com/downloads/tournament-regulations/AFC-Champions-League-Two-2026-27-Competition-Regulations-Jun18upd.pdf): sumber inspirasi struktur kompetisi. ELEVEN tidak berafiliasi dengan AFC.

Dokumentasi rancangan: [Mesin & statistik](docs/ENGINE.md) · [Android & multiplayer](docs/ANDROID.md).
