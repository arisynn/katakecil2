> Catatan: dokumen ini adalah audit sebelum implementasi. Implementasi dan hasil akhir ada di PERUBAHAN.md dan VALIDASI.md. Ukuran tablet yang disebut di audit berasal dari sesi sebelumnya; tidak ada pengujian tablet pada pembaruan ini.

# Kata Kecil — audit dan rencana update-008

Audit: 2 November 2026. Sumber `arisynn/katakecil2`, main
`5dc416e3a8bd8b6ab839970830c9a7fd9b5887d2` (update-007).
Working tree aplikasi yang diperiksa cocok dengan main tersebut. Tidak ada
perubahan source aplikasi, database, Edge Functions, Storage, token, atau uploader.
Audit memakai kode dan browser produksi lokal; artefak audit berada di folder
`katakecil-audit-008/` di samping dokumen ini.

Interpretasi judul: judul buku pada toolbar pembaca. Judul di rak tetap berada di
sampul. Judul bab di dalam isi EPUB tetap menjadi isi buku; perubahan node teksnya
bisa menggeser CFI dan tidak termasuk perbaikan toolbar.

## Temuan yang sudah terbukti

### A. Judul pembaca belum benar-benar di tengah

`HeaderBar.tsx:262–272` menaruh tombol kembali dan judul dalam satu kelompok kiri.
Judul tengah desktop disembunyikan pada perangkat mobile (`:347–351`).
`katakecil-glass.css:535–549` membuat kelompok kiri mengisi ruang tersisa, tetapi
teks tidak dihitung relatif terhadap pusat toolbar dan lebar kontrol kanan.
ResizeObserver hanya menghitung lebar header untuk mode compact, belum mengukur
ruang kontrol kiri/kanan.

Hasil browser dengan judul asli **Masa Panen**:

| Lebar | Tengah toolbar | Tengah kotak teks judul | Selisih ke kiri |
| --- | ---: | ---: | ---: |
| 360 px | 180 | 94,5 | 85,5 px |
| 393 px | 196,5 | 94,5 | 102 px |
| 768 px | 384 | 92,5 | 291,5 px |

Tidak ada duplikasi judul desktop/mobile pada baseline terbaru; masalah sekarang
adalah penempatan judul tunggal. Bukti: `header-360.png`, `header-393.png`,
`header-768.png`, serta `results.json`.

### B. Kegagalan membuka mesin reader dapat meninggalkan loading tanpa pemulihan

`FoliateViewer.tsx:905–1075` memanggil `openBook()` tanpa penanganan rejection.
Di dalamnya ada await import modul, `view.open()`, `view.init()`/pemulihan CFI.
Kegagalan pada tahap ini tidak diteruskan menjadi state error yang dapat dipakai UI.

Reproduksi terkontrol, hanya di browser uji: metode `foliate-view.open()` dibuat
menolak dengan `AUDIT_SIMULATED_OPEN_FAILURE`, tanpa mengubah source atau EPUB.
Sesudah empat detik:

- URL tetap di reader buku yang dipilih.
- Browser melaporkan rejection tersebut.
- UI tetap mempunyai satu spinner dan teks “Memuat...”.
- Tidak ada pesan gagal maupun tindakan Coba lagi.

Bukti: `open-failure.png` dan `results.json`.
Ini membuktikan celah penanganan kegagalan renderer. Ini belum membuktikan penyebab
persis gangguan yang dialami pengguna—misalnya koneksi, EPUB tertentu, atau posisi
baca meloncat.

**Pembedaan penting:** kegagalan memuat data buku di `initViewState` sudah melakukan
rethrow setelah menyimpan error (`readerStore.ts:398–422`), dan caller memiliki
catch/toast. Uji ID buku yang tidak tersedia kembali ke rak; kasus ini tidak
menghasilkan spinner macet. Jangan menyamaratakan semua error loading.

### C. Status loading terpecah dan tidak menunjukkan satu batas “siap dibaca”

- `readerStore.ts:382`: loading false ketika dokumen/config tersedia, inited masih
  false, sebelum mesin selesai memulihkan lokasi.
- `ReaderContent.tsx:444–452`: timer loading dibuat dari render ketika data belum
  siap. Timer seharusnya dimiliki lifecycle dan dibersihkan.
- `FoliateViewer.tsx:909`: timer loading 200 ms tidak disimpan untuk dibatalkan.
- `docLoadHandler` menandai docLoaded pada event load; kondisi spinner awal memakai
  `!docLoaded`, bukan keberhasilan seluruh proses pemulihan lokasi.
- Ada state tambahan navigating untuk pindah bagian.

Temuan kode ini terverifikasi. Gejala kedipan, terlambatnya indikator, atau halaman
awal yang terlihat sementara masih perlu diuji pada skenario lambat. Belum ada
bukti bahwa posisi pengguna pasti rusak.

## Risiko yang perlu dibuktikan sebelum disebut akar bug

1. **Hasil async dari sesi lama.** `initViewState` menulis hasil setelah await,
   sedangkan clearViewState dapat menghapus key ketika pengguna keluar. Belum ada
   generation guard untuk memastikan hasil hanya masuk ke sesi yang masih aktif.
   FoliateViewer memiliki unmountedRef untuk pembersihan listener, tetapi bukan
   penghentian seluruh langkah open/init setelah await.
2. **Preview bisa tertinggal.** ReaderPageFrame mempertahankan snapshot lama sampai
   snapshot berikutnya siap. Promise snapshot bergantung pada load iframe tanpa
   batas waktu/fallback async yang eksplisit. Pemicu capture juga belum langsung
   bergantung pada revisi layout/font/resource yang selesai belakangan.
3. **Penyimpanan saat pemulihan.** Pastikan relocate awal, deep-link sementara,
   pergantian font, dan background sebelum ready tidak mengganti CFI tersimpan
   dengan posisi sementara. Autosave sudah memiliki perlindungan preview dan
   no-op save; perlindungan itu harus dipertahankan dan diuji terhadap urutan event.

Ketiganya temuan risiko dari alur kode, bukan klaim hasil reproduksi pada HP pengguna.

## Rencana implementasi berurutan

### 1. Bekukan baseline dan tambah tes regresi

- Buat checkout update-008 dari main terbaru; bawa hasil audit ini sebagai acuan.
- Tambahkan tes gagal untuk kegagalan open/init dan error yang terlihat oleh UI.
- Tambahkan pengukuran judul/ruang kontrol pada judul pendek dan panjang.
- Buat skenario buka buku → kembali sebelum selesai → buka buku lain; respons lama
  sengaja diperlambat untuk memastikan tidak mengambil alih sesi baru.
- Rekam fase download, parsing, restore, dan halaman terlihat. Jangan menyebut waktu
  unduh sebagai waktu render. Sampel normal audit hanya satu: route sekitar 6 dtk,
  dokumen berteks terdeteksi sekitar 6,7 dtk; ini bukan benchmark atau p95.

### 2. Perbaiki lifecycle pemuatan dan pemulihan error terlebih dahulu

- Sediakan satu kontrak fase runtime per sesi buku:
  `preparing → opening → restoring → ready`, dengan cabang `error`/pembatalan.
  Nilai setting dan format BookConfig tidak perlu dimigrasikan.
- Pertahankan kompatibilitas loading/inited yang dipakai komponen lama, melalui
  derivasi/adaptasi yang jelas; hindari beberapa boolean yang saling menyangkal.
- Tangkap kegagalan import, buka, dan restore; tampilkan pesan manusiawi serta
  **Coba lagi** dan **Kembali ke rak**. Bedakan proses lambat dari proses gagal;
  indikator lambat tidak boleh menganggap buku rusak atau menghapus cache.
- Gunakan identitas/generation sesi dan cleanup timer/listener. Respons yang sudah
  tidak relevan tidak boleh memasang view, menandai ready, atau menulis progres.
  Jangan membatalkan promise unduhan bersama secara membabi buta.
- Retry memakai lokasi terakhir yang terkonfirmasi; tidak otomatis kembali ke
  awal. Bila CFI tidak valid, sediakan pemulihan yang jelas tanpa menimpa nilai
  tersimpan diam-diam.
- Simpan progres terakhir yang valid pada penutupan/background sesuai perilaku
  sekarang. Jangan menyimpan posisi sementara sebelum restore selesai. Mode
  deep-link tetap melindungi lokasi baca asli.

### 3. Jadikan header judul adaptif dan stabil selama loading

- Satu komponen presentasi header, dengan kelompok kontrol kiri, judul, dan kanan;
  tidak menambahkan salinan header baru di atas header lama.
- Pusatkan judul terhadap area toolbar/cell buku. Ukur lebar kontrol kiri dan kanan;
  cadangkan ruang simetris memakai sisi yang lebih lebar. Batas judul mengikuti
  ruang aman, bukan angka persentase tetap.
- Judul panjang satu baris dengan ellipsis; judul penuh tetap dapat diakses.
  Tombol tidak ditumpuk atau diperkecil untuk memaksa teks masuk.
- Gunakan judul katalog/library yang sudah dikenal sejak loading. Fallback ke
  metadata atau nama berkas yang layak; bila belum diketahui, tampilkan status
  memuat. Hindari hash/UUID sebagai judul dan pergantian judul yang berkedip.
- Saat mesin belum ready, kontrol yang memerlukan view tidak aktif; tombol kembali
  tetap bekerja. Hindari angka progres 0/NaN yang tampak sebagai hasil final.
- Terapkan pada HP, tablet, desktop, RTL dan cell buku dengan sidebar pinned;
  tetap satu judul. Tidak mengubah identitas Kata Kecil atau judul di luar sampul.

### 4. Rapikan penyegaran preview halaman

- Pertahankan satu mesin Foliate dengan geometri penuh. Efek menyusut tetap memakai
  mirror pasif; jangan mentransformasi mesin asli karena dapat merusak paginasi.
- Pastikan snapshot sesuai sesi/lokasi/layout yang sedang aktif sebelum ditampilkan.
- Tangani snapshot yang gagal atau terlalu lama dengan menampilkan live page yang
  valid, bukan preview lama atau bidang kosong.
- Sinkronkan capture dengan layout yang stabil setelah font/gambar/resizing, tetap
  dibatasi agar tidak menyalin seluruh DOM setiap event atau menjalankan skrip buku.

### 5. Verifikasi dan kemas update-008

- Tes unit perilaku, TypeScript/Biome, build produksi, dan browser.
- Matrix: cold/warm cache, offline, request gagal, EPUB gagal dibuka, CFI tidak
  valid, chapter lambat, font terlambat, resize/rotasi, reload, back cepat, serta
  buka-tutup pengaturan saat membaca.
- HP 360/393/412, tablet 768, landscape, terang/gelap, e-ink, solid, reduced motion,
  RTL, safe area, keyboard. Real Android diperiksa jika perangkat tersedia;
  emulasi harus disebut sebagai emulasi.
- Regresi: CFI, bookmark, catatan, TTS, carousel, sampul asli dan Ongoing tetap aman.
- ZIP standar beserta installer, checksum, cadangan dan rollback; whitelist commit
  ke main dan tanpa kewajiban build lokal di Android seperti update-007.

## Kriteria selesai

- Tengah judul berselisih maksimal 2 px dari tengah area header yang relevan,
  tidak bertabrakan dengan kontrol, dan hanya satu judul terlihat.
- Error renderer berakhir pada pesan/tindakan pemulihan, bukan spinner tanpa akhir.
- Proses sesi lama tidak menghidupkan kembali reader yang sudah ditutup atau
  menimpa buku baru.
- Buka/tutup kontrol dan pemuatan ulang mempertahankan lokasi terkonfirmasi;
  snapshot tidak mengganti halaman dengan salinan yang tidak relevan.
- Seluruh pemeriksaan dan batas yang belum bisa diuji dilaporkan bersama screenshot.

## Cakupan dan batas audit ini

Audit dan rencana saja; belum ada patch update-008 atau klaim bug telah diperbaiki.
Browser memakai Chromium headless, UA Android dan sentuhan pada viewport HP/tablet.
Tidak ada uji perangkat Android fisik. Simulasi kegagalan dipisahkan dari kondisi
normal. Tidak menjalankan build ulang atau seluruh tes unit karena source tidak
berubah. Kegagalan persis yang dilihat pengguna masih perlu dicocokkan dengan
gejalanya; implementasi tidak boleh menganggap semua kasus berasal dari satu sebab.
