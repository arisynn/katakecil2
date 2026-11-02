# Validasi update-008

Baseline main: 5dc416e3a8bd8b6ab839970830c9a7fd9b5887d2. Pemeriksaan pada 2 November 2026 UTC.

## Pemeriksaan otomatis

- `pnpm install --frozen-lockfile`: lulus, tanpa perubahan dependency/lockfile.
- `pnpm lint`: TypeScript dan Biome lulus; satu informasi Biome yang sudah ada pada `capturedTurn.ts` (inisialisasi undefined), bukan kegagalan.
- `pnpm test --run --exclude '**/tablet-controls.test.tsx'`: 19 berkas, 72 tes lulus. Tes tablet dikecualikan sesuai permintaan pengguna.
- `pnpm build`: build produksi Next.js 16/Webpack selesai. Peringatan konfigurasi Cache-Control statis yang sudah ada tetap muncul.
- Tes regresi sebelum perbaikan membuktikan sesi terlambat dapat hidup kembali, CFI sementara dapat menimpa lokasi tersimpan, preview bab lama tertahan, dan penolakan snapshot tidak ditangani. Regresi tambahan membuktikan deep-link preview dapat mengganti CFI di memori. Semua tes tersebut lulus sesudah perbaikan.
- Installer diuji pada clone main terisolasi, bukan repo pengguna: checksum/baseline, penolakan perubahan tracked/untracked, pemasangan berulang, perlindungan edit baru saat rollback, commit whitelist, rollback sebelum/sesudah commit, serta penolakan payload rusak. Aktivasi dummy dan checksum uploader dipertahankan.

## Browser HP

Chromium headless dengan user agent Android, sentuhan, dan locale Indonesia. Ukuran HP 360×740, 393×851, dan 412×915; 851×393 adalah rotasi HP, bukan pengujian tablet.

- Judul asli Masa Panen terpusat pada x=180/196,5/206 sesuai lebar 360/393/412; tidak bertabrakan dengan kontrol kanan. Judul panjang memakai elipsis. Judul juga hadir ketika open sengaja ditahan.
- Simulasi satu kali kegagalan `FoliateView.open()` dan `init()` menampilkan error, tanpa unhandled pageerror. Coba lagi berhasil. Titik teks dari CFI tersimpan tetap berada dalam rentang halaman yang ditampilkan. Rentang CFI satu layar dapat dinormalisasi saat font/layout selesai; tidak memaksa persamaan seluruh rentang sebagai ukuran keberhasilan restore.
- Menutup reader ketika open masih pending, kemudian menyelesaikan permintaan lama, tidak menghidupkan viewer kembali. Pembukaan berikutnya memulihkan titik baca.
- Membuka deep link ke bab lain lalu kembali ke rak tanpa membaca tidak menimpa CFI tersimpan di IndexedDB.
- Hanya satu `foliate-view` aktif. Saat kontrol atau panel tampilan dibuka, cerminan halaman menyusut di tengah dan menyesuaikan ruang panel; lebar/tinggi mesin live tetap. Ukuran/font berubah pada isi EPUB dan cerminan, tanpa membuat mesin kedua. Reduced motion menonaktifkan transisi preview.
- Pengaturan cepat dan seluruh sepuluh halaman pengaturan, lingkup Buku ini, tombol kembali browser, Isi/TOC, pencarian, catatan, bookmark dan kontrol TTS diperiksa. TOC pekat, episode/judul terpisah, bab aktif serta Posisi Saat Ini tersedia; penutupan panel mempertahankan lokasi.
- Carousel swipe tidak membuka buku; ketuk membuka reader; kembali ke rak mempertahankan identitas buku aktif. Grid/list dan fitur rak mengikuti baseline update-007.
- Sampul katalog asli Garis yang Kita Teruskan dan Masa Panen mendapatkan HTTP 200, `naturalWidth/Height` masing-masing 1024×1536 dan 992×1586. Diperiksa setelah refresh, kembali dari reader, dan metadata blob kedaluwarsa yang disimulasikan di browser. Placeholder tidak dihitung sebagai keberhasilan gambar.
- Ongoing tetap Ongoing ketika readingStatus=finished dan progres=100% disimulasikan pada data browser. Tidak ada perubahan data server.
- Mode terang/gelap, solid controls, e-ink lewat pengaturan, fokus keyboard, Escape, dan safe area CSS diperiksa. Uji awal override inset atas 32 px menemukan toolbar reader masih di atas inset; perbaikan memakai max antara inset aplikasi dan CSS browser/PWA. Snapshot final memperlihatkan toolbar melewati inset, dengan judul tetap terpusat.

## Batas pemeriksaan

- Tablet sengaja tidak diuji. Tidak ada pengujian perangkat Android fisik, keyboard virtual fisik, TalkBack, suara TTS pada perangkat, Safari, atau Firefox. TTS hanya diuji akses dan status kontrol di browser; ini bukan verifikasi kualitas audio semua engine.
- Tidak tersedia contoh spesifik dari pengguna untuk seluruh variasi bug load halaman. Fault injection membuktikan penanganan kegagalan frontend, bukan penyebab setiap kegagalan EPUB atau backend produksi.
- Satu HTTP 404 teramati pada jalur lokal `/Readest/Books/af3ecce6621da68421d8dccfa01151d9/cover.png` ketika kembali ke rak. Ini terpisah dari dua URL sampul katalog yang terbukti HTTP 200. Bukti ini belum menunjukkan kegagalan izin Supabase, sehingga tidak ada perubahan backend maupun permintaan upload ulang. Lihat `evidence/recovery.log`.
- Tidak menguji login/token pribadi atau melakukan mutasi database, Edge Functions, RLS, Storage, publikasi, dan uploader. Tidak ada push dari workspace ini; commit/push dilakukan melalui perintah Termux yang disediakan.

Screenshot dan log terpilih ada dalam ZIP pada `screenshots/` dan `evidence/`.
