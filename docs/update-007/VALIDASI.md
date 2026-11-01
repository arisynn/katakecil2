# Verifikasi update-007

Tanggal: 1 November 2026. Baseline main terbaru yang diperiksa ulang:
`7f60123143c2a8a39a74bf9929f14e66f4b1b950` (update-006).

- `pnpm lint`: lulus TypeScript dan Biome. Satu informasi yang sudah ada pada
  `nativePageTurn.ts` tentang inisialisasi undefined; tidak ada error.
- `pnpm test --run`: 18 berkas, 63 tes lulus.
- `pnpm build`: build produksi Next/webpack berhasil, termasuk service worker.
  Peringatan Cache-Control yang sudah ada tetap muncul.
- `pnpm test:publisher`: 25 tes lulus. Source uploader tidak berubah.
- Tes outline benar-benar dijalankan pada TOCItem baseline: ketiga tes gagal
  (caption episode, indeks bukan halaman, aksi posisi/Space), kemudian lulus
  setelah perbaikan. Alias pencarian WordLens juga diuji gagal/lulus.
- Regresi tablet direproduksi lewat browser dan tes unit: mouseleave sintetis
  menutup panel pada layar lebar. Kini sentuhan tidak memakai dismissal pointer;
  tiga tes tablet/HP/desktop lulus, sementara tablet gagal pada kode sebelumnya.
  Header tablet juga diperiksa hanya menampilkan satu judul buku; judul desktop
  disembunyikan ketika header perangkat mobile digunakan.
- Tes penyimpanan Mode dokumen memastikan perubahan gulir khusus buku disimpan,
  CFI/catatan tetap, dan nilai global tidak ikut berubah.

Browser: Chromium headless dengan UA Android dan sentuhan pada reader, locale
Indonesia. Layar 360×740, 393×851, 412×915; tablet 768×1024 terang/gelap;
landscape 851×393. Screenshot implementasi dan log disertakan dalam ZIP.

Alur yang diperiksa:

1. Sampul asli HTTP 200: Garis yang Kita Teruskan PNG 1024×1536; Masa Panen JPG
   992×1586. `naturalWidth`/`naturalHeight` dan ukuran kontainer diperiksa.
   Diuji sesudah refresh serta kembali dari reader. Placeholder buku contoh
   tanpa cover_url tidak digunakan sebagai bukti sampul asli.
2. Carousel satu/dua buku memakai subset katalog sebagai fixture browser dengan
   URL gambar asli; tanpa duplikasi. Swipe CDP tidak membuka buku. Ketukan sampul
   membuka reader dan pilihan buku yang sama dipulihkan saat kembali. Grid/list
   dan pencarian rak tetap bekerja. Refresh diuji untuk muat gambar, bukan untuk
   menjanjikan urutan carousel yang sama setelah pengurutan ulang.
3. Satu dialog Settings saja di reader. Sepuluh halaman baru dibuka melalui UI.
   Segmen Buku ini mengubah nilai nyata, ukuran huruf disimpan, browser Back
   menutup pengaturan. Panel pencarian, catatan dan penanda dapat dijangkau. Pemutar mini TTS juga dibuka lewat tombol
   Dengarkan; pemeriksaan ini tidak mengukur kualitas suara.
4. Preview halaman menyusut ketika kontrol/pengaturan cepat terbuka; ukuran live
   Foliate tetap 393×851. Font/ukuran pada preview mengikuti halaman aktif. Pilihan font cepat diuji
   benar-benar menerapkan Bitter pada EPUB aktif.
   Hanya satu `foliate-view` aktif, tidak ada replika mesin interaktif.
5. Panel daftar isi memiliki background RGB pekat dan backdrop-filter none,
   episode/judul terpisah, bab aktif ditandai. Tab aktif tidak menutup panel.
   Back browser menutup panel dengan posisi baca tetap. Bookmark tersimpan sebagai
   CFI; reader kembali ke halaman yang sama setelah rak dan refresh.
6. `readingStatus=finished` dan progres 100% disimulasikan hanya pada browser uji:
   badge tetap Ongoing dari katalog. Blob metadata kedaluwarsa tidak mengganti
   cover_url asli. Server dan data pembaca lain tidak ditulis.
7. Preferensi solid tersimpan setelah refresh. Mode e-ink, RTL dan pengurangan
   gerak diperiksa. Override safe area browser 32 px/24 px berhasil; header
   pengaturan memakai padding atas 32 px. Tab keyboard tetap di panel; Escape
   kembali ke indeks pengaturan.
8. Installer diuji di clone sementara: baseline, perubahan tracked/untracked,
   berkas aktivasi palsu yang diabaikan Git, checksum uploader, instalasi berulang,
   penolakan rollback sesudah edit, whitelist commit, rollback commit, serta
   penolakan payload rusak. Tree sesudah rollback sama dengan baseline.

## Batas pemeriksaan

Emulasi browser tidak menggantikan perangkat Android, tablet, atau layar e-ink
fisik. Keyboard perangkat lunak OEM, cutout perangkat nyata, refresh e-ink,
kualitas/pemutaran suara TTS, headset/Bluetooth/gamepad, dan perilaku baterai
belum diuji pada perangkat nyata. Katalog uji publik menyediakan EPUB; pengaturan
PDF/fixed-layout dipindahkan dengan controller lama dan lolos typecheck, tetapi
alur dokumen PDF lengkap tidak diuji di browser. Tidak semua kombinasi preferensi
lanjutan/kamus/layanan eksternal diuji satu per satu. Ini paket source; pemasangan
Termux dan push dilakukan pengguna, bukan klaim telah dipasang di HP pengguna.
