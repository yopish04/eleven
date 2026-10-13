# Arah Android dan multiplayer

## Yang diserahkan sekarang

Prototipe web di server dengan navigasi bawah, area sentuh ponsel, dua peran, penyimpanan akun dan kompetisi lengkap. Belum ada APK, emulator test atau publikasi Play Store. Satu pemilik mencoba pemain sekaligus pelatih; lawan dan anggota tim lainnya NPC. Perubahan arah mengikuti permintaan: coba prototipe di server terlebih dahulu sebelum membangun aplikasi Android.

## Implementasi Android yang disarankan

Gunakan Kotlin + Jetpack Compose untuk layar native: beranda karier, latihan, roster/taktik, kompetisi dan analitik. Replay bisa memakai Canvas 2D berdasarkan event server. Mesin pertandingan tetap di backend; aplikasi mengirim keputusan dan menampilkan hasil, sehingga modifikasi aplikasi tidak dapat menetapkan atribut/skor. UI React dari prototipe perlu diimplementasikan ulang, sedangkan kontrak API, aturan domain, tes dan data dapat dipakai sebagai acuan.

Tahap Android pertama: klien API bertipe, login yang sesuai backend produksi, model lokal Room untuk cache baca, state loading/offline/error, request idempotency dan pengujian layar pada perangkat nyata. Tidak mengizinkan permainan kompetitif mengubah progres saat offline. Kerjakan animasi 3D hanya setelah model pertandingan dan loop harian terbukti menyenangkan.

## Bentuk dunia multiplayer

- Satu akun memilih satu karakter pemain aktif atau satu jabatan pelatih per dunia kompetitif. Membership dan kepemilikan disimpan di server, bukan ditentukan tab UI.
- Pemain mengatur latihan, pemulihan dan instruksi pribadinya. Pelatih memilih XI, taktik dan proposal perekrutan; tidak dapat langsung mengubah atribut anggota.
- Klub berisi manusia dan slot NPC yang diberi label. Pengguna tidak hadir tetap bermain melalui instruksi terakhir yang sah.
- Mulai dari satu liga domestik Indonesia. Tambahkan promosi/degradasi, piala, kualifikasi Asia dan liga negara lain bertahap. Lisensi nama/logo dan sumber data profesional adalah pekerjaan terpisah dari meniru struktur kompetisi.
- Dunia memiliki kalender dan waktu pertandingan dari server. Snapshot roster/taktik dikunci sebelum kickoff; scheduler memasukkan job unik fixture+engineVersion ke antrean. Laga tidak boleh dipercepat oleh satu anggota seperti pada demo.
- Worker simulasi menghasilkan event berurutan. Klien Android menerima update melalui kanal realtime; reconnect melanjutkan dari event sequence terakhir.

## Komponen dan data produksi

| Komponen | Tanggung jawab |
| --- | --- |
| Android app | Interaksi pemain/pelatih, replay, notifikasi, cache baca |
| Identity & club API | Login, sessions, membership, kontrak, hak akses per aksi |
| Career service | Latihan, progres, usia, kondisi, ledger perubahan |
| Competition service | Jadwal, aturan per musim, kualifikasi, klasemen |
| Match worker | Snapshot beku, RNG server, event log, hasil deterministik |
| Realtime gateway | Distribusi event, reconnect, spectators, batas kapasitas |
| Relational database | User, player, club, membership, fixture, match, event, training |
| Queue & scheduler | Kickoff, retry aman, job unik, penyelesaian musim |

RNG/seed kompetitif tidak dibocorkan sebelum pertandingan selesai. Simpan engineVersion dan snapshot untuk audit. Gunakan transaksi/unique constraints agar satu laga hanya menambah statistik sekali. Settlement tidak bergantung pada klien yang menonton. Tambahkan observabilitas, back-up, load test, moderasi nama/chat, dan pembatasan pembuatan akun sebelum membuka multiplayer publik.

## API prototipe

`GET /api/game`: dunia aktif atau null. `GET /api/game?match=<fixtureId>`: catatan replay milik akun aktif. `POST /api/game` dengan JSON:

- `start`: name, clubId, position.
- `train`: version, focus; pemain selalu ditentukan server.
- `tactics`: version, tactics, lineup (11 ID unik dari klub sendiri).
- `advance`: version; menjalankan satu matchday dunia demo.
- `reset`: version, name, clubId, position; mengganti progres setelah konfirmasi UI.

API ini cukup untuk membuktikan loop permainan. Untuk Android produksi, pisahkan endpoint, tambahkan schema/OpenAPI dan auth produksi. Sites sign-in pada demo tidak otomatis menjadi mekanisme login native Android.
