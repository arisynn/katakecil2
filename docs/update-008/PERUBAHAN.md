# Kata Kecil update-008

Baseline: main 5dc416e3a8bd8b6ab839970830c9a7fd9b5887d2 (sesudah update-007).

## Temuan dan perbaikan

- Judul HP sebelumnya berada dalam kelompok tombol kiri; judul tengah disembunyikan pada mobile. Audit browser pada lebar 393 px mengukur pusat teks x=94,5, padahal pusat toolbar x=196,5. ReaderTitle kini mengukur kelompok kontrol kiri/kanan dengan ResizeObserver dan menyediakan ruang simetris dalam setiap panel buku. Judul panjang dipotong dengan elipsis, nilai lengkap tetap tersedia sebagai teks/atribut title. Judul katalog tampil sejak menyiapkan buku.
- FoliateViewer memanggil openBook tanpa menangani penolakan import/open/init. Kegagalan open yang disimulasikan menghasilkan pageerror dan spinner tanpa pemulihan pada baseline. Sekarang proses memiliki fase preparing/opening/restoring/ready/error, serta pesan error dengan Coba lagi dan Kembali ke rak. Loading lambat menawarkan pemulihan sesudah 8 detik, tanpa batas waktu yang membatalkan buku besar secara otomatis.
- Toolbar atas juga memakai safe-area-inset-top CSS pada browser/PWA yang tidak melaporkan inset lewat bridge native.
- Timer loading di dalam render dan timer tanpa cleanup dihapus. Sesi memiliki identitas unik sejak permintaan dimulai; hasil lama diabaikan jika buku ditutup atau percobaan baru dimulai. Viewer parsial ditutup dan dikeluarkan dari DOM.
- Relokasi sementara saat restore belum selesai tidak disimpan. Setelah init selesai, lokasi terpecahkan dari mesin Foliate menjadi sumber progres. Deep link dilindungi sebagai preview sebelum init; auto-save menghormati fase loading. Percobaan ulang memakai lokasi/config tersimpan, tanpa reset buku atau anotasi.
- Preview pasif tidak lagi mempertahankan gambar bab lama saat snapshot baru dimuat. Penolakan atau frame yang tidak selesai dalam 2,5 detik mengembalikan halaman live yang tetap dapat digunakan; hasil terlambat diabaikan. Snapshot diperbarui sesudah renderer stabil. Mesin EPUB live tetap satu dan tidak ditransformasi/diperkecil: yang menyusut adalah cerminan pasif, sehingga ukuran halaman dan CFI tidak berubah.

## Kompatibilitas

Tidak ada migrasi format pengaturan atau data baca. Fase loading hanya state sesi di memori. Pengaturan, TOC/Isi, pencarian, bookmark, catatan, highlight, TTS, carousel, grid/list, sampul asli, serta pemetaan Ongoing dari katalog mengikuti update-007. Backend, database, RLS, Edge Functions, Storage, token aktivasi, jadwal publikasi, dan uploader kk tidak diubah. Tidak ada dependensi baru atau target native.

## Cakupan berikutnya

Paket ini memperbaiki masalah yang teramati pada audit. Belum tersedia contoh EPUB/rekaman dari pengguna untuk bug load halaman yang spesifik; jangan menganggap setiap kemungkinan masalah EPUB sudah diperbaiki. Pengujian gangguan renderer di browser adalah simulasi frontend, bukan bukti masalah backend produksi.
