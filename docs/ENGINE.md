# Mesin pertandingan dan arti statistik

## Prinsip: aksi dahulu, statistik kemudian

Input pertandingan adalah snapshot dua klub (atribut, kondisi, formasi dan XI), versi engine, seed, venue netral/kandang, status knockout, serta agregat leg pertama. Snapshot ini disimpan bersama hasil. Fungsi simulasi murni: tidak membaca jam sistem, tidak memakai `Math.random()`, tidak memodifikasi input.

Aksi yang dimodelkan adalah umpan, duel, dan tembakan. Setiap aksi memiliki waktu, pelaku, lawan, hasil dan probabilitas ketika relevan. Statistik tim, pemain, skor dan replay berasal dari catatan yang sama. Tidak ada endpoint untuk mengirim skor atau atribut baru dari browser.

## Atribut dan keputusan

| Faktor | Pengaruh yang diterapkan |
| --- | --- |
| Passing + vision | Peluang umpan berhasil terhadap defending dan tekanan lawan |
| Pace + vision | Menang duel melawan kemampuan bertahan |
| Finishing | Akurasi dan konversi tembakan; bukan penambah gol tetap |
| Goalkeeping | Mengurangi konversi peluang lawan |
| Stamina | Mengurangi penurunan kemampuan sepanjang waktu pertandingan |
| Kondisi | Skala kesiapan awal dan efek latihan/pemulihan |
| Kecocokan posisi | Penalti 22% efektivitas atribut bila bermain di luar posisi |
| Formasi | Distribusi bek, gelandang dan penyerang serta pemilihan pelaku |
| Possession/direct | Tradeoff akurasi umpan vs kecepatan progresi zona |
| Mentalitas | Frekuensi keputusan menembak ketika bola di zona akhir |
| Pressing | Tekanan pada umpan/duel lawan; biaya fatigue dan kondisi |

OVR hanya ringkasan tiga atribut sesuai posisi. Skor **tidak** diundi dari selisih OVR. Pemain lebih baik tidak selalu menang dalam satu pertandingan; tes dilakukan pada banyak seed berpasangan.

## Model angka awal

`effective = attribute × (0.65 + 0.35 × condition/100) × (1 − fatigue) × positionFit`.

Fatigue meningkat dengan menit bermain, intensitas pressing, dan stamina rendah. Pada jeda antarpekan, kondisi pulih 18 poin; pemain yang turun juga kehilangan kondisi sesuai menit, stamina, dan pressing. Latihan atribut memakan 14 kondisi. Latihan pemulihan menambah 25 kondisi. Batas atribut 99 dan kondisi 30–100 untuk siklus pertandingan.

xG dihitung dari jarak ilustratif, sudut, dan kualitas peluang terhadap tekanan bek. Finishing dan kemampuan kiper memodifikasi probabilitas konversi secara terpisah. xA adalah jumlah xG tembakan yang berasal dari umpan terakhir pemain, bukan jumlah assist. Tembakan pada penalti penentuan pemenang dipisahkan dari statistik pertandingan.

Rating kontribusi dimulai dari 6 dan menggunakan gol, assist, tekel, intersepsi, penyelamatan, umpan berhasil dan umpan gagal; dibatasi 3–10. Ini bukan rumus rating Opta/FotMob. Rumus lengkap dan konstanta ada di `src/engine.js`.

Model memiliki delapan aksi bermakna setiap menit. Tidak mengklaim rekonstruksi setiap sentuhan, penguasaan berdasarkan detik nyata, ataupun tracking posisi. Penguasaan di UI adalah proporsi aksi umpan/duel. Posisi pemain pada lapangan adalah ilustrasi formasi; koordinat event menggunakan zona abstrak.

## Penyimpanan dan integritas

Satu akun memiliki satu dunia demo aktif. `worlds.payload` menyimpan roster, atribut, jadwal, ringkasan hasil dan total karier. `matches.payload` menyimpan snapshot input serta kejadian setiap pertandingan. Membaca match selalu membutuhkan pemilik yang sama dan run yang sedang aktif.

Mutasi membawa `version` terbaru. Server menghitung perubahan sendiri dan menulis dengan compare-and-swap. Sebuah token mutasi unik mengikat penulisan match dengan pembaruan world yang berhasil. Semua dijalankan dalam satu D1 batch atomik; kegagalan penulisan match membatalkan progres world. Versi usang mendapat 409; UI memuat ulang tanpa menerapkan aksi diam-diam. Reset hanya mengganti dunia milik akun tersebut dan menghapus replay miliknya setelah konfirmasi.

Ini fondasi prototipe berukuran kecil. Blob world bukan arsitektur untuk jutaan pemain. Migrasi berikutnya memisahkan players, memberships, fixtures, results, event chunks dan stat projections; event store tetap sumber audit.

## Validasi dan pekerjaan selanjutnya

`test/engine.test.js` memverifikasi statistik konservatif, determinisme snapshot, pengaruh atribut, batas latihan, XI, tiebreak dan musim lengkap. `test/api.test.js` menjalankan SQL yang sama pada SQLite sungguhan untuk isolasi pemilik, persistensi, rollback dan versi. `docs/benchmark.json` adalah eksperimen sensitivitas finishing dengan 500 seed per varian, bukan bukti akurasi simulasi sepak bola nyata.

Untuk klaim realistis diperlukan data berizin, target distribusi per kompetisi/posisi, fitting parameter dan holdout test. Tambahkan sepak bola yang belum dimodelkan: dribbling detail, first touch, crossing, heading, chemistry, kartu, cedera, pergantian, set piece dan keputusan taktis per fase. Baru setelah itu tetapkan versi kalibrasi, simpan dataset/version provenance, dan uji keseimbangan permainan lintas musim.
