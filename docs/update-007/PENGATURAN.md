# Audit dan pemetaan pengaturan update-007

Baseline: main setelah update-006 (lihat BASE_COMMIT di paket). Web saja.
Audit dilakukan sebelum perubahan: 108 pemakaian penanda `data-setting-id` dan 87 definisi
perintah pencarian, ditambah menu rak, View Options, dan pengaturan cepat.
Gabungannya menghasilkan 119 ID unik. Pemetaan per ID terdapat dalam inventaris
CSV; field dan cakupan persistensi tetap mengikuti panel asal.

| Lokasi lama | Lokasi baru | Fungsi yang dipertahankan |
| --- | --- | --- |
| Settings → Font | Teks & halaman → Huruf | Override font EPUB, ukuran default/minimum, bobot, kategori serif/sans, font serif/sans/monospace/CJK, font sistem yang didukung, impor/kelola/hapus font tambahan, hapus semua font |
| Settings → Layout | Teks & halaman → Tata letak halaman | Override tata letak, arah tulisan, bingkai vertikal, paragraf bawaan, indentasi, jarak paragraf/baris/kata/huruf, perataan, pemenggalan kata, margin empat sisi, gap/kolom, batas lebar/tinggi, header/footer, gaya/warna/ukuran teks indikator, nomor referensi, orientasi jika didukung |
| Settings → Theme/Color | Tema & tampilan → Tema & warna | Target rak/reader, terang/gelap/otomatis, palet, editor tema khusus, warna buku/gambar, tekstur/opacity/ukuran/impor/hapus, warna/label/opacity sorotan, penggaris baca, sorotan kode/dialog dan editor gaya TTS |
| Settings → Behavior → E-ink/Device | Tema & tampilan → Layar & material | E-ink, e-ink warna, sembunyikan tombol rak; refresh layar penuh tetap mengikuti kemampuan platform |
| Menu rak → Solid controls | Tema & tampilan → Layar & material | Preferensi material solid yang sama (`katakecil:solid-ui`) |
| Settings → Behavior → Scroll/Pagination | Navigasi & kontrol → Gestur & alat baca | Gulir/bagian tunggal/overlap/scrollbar, tap/swipe/dua sisi/tukar sisi/double tap, tombol halaman, nomor stabil |
| Settings → Behavior → Tools/Animation | Navigasi & kontrol → Gestur & alat baca | Pull-down bookmark, aksi cepat/jenis aksi, pertahankan seleksi kamus, salin ke notebook, susunan toolbar, animasi/gaya, pintasan keyboard/mouse, page turner sesuai kemampuan |
| Settings → Behavior → Device lain | Navigasi & kontrol → Gestur & alat baca | Wake lock, cursor, mouse wheel, gamepad; brightness tetap hanya jika platform mendukung |
| Reader → View Options | Navigasi & kontrol → Mode dokumen (buku terbuka) | Zoom/kontras, fit halaman/lebar, spread/cover/arah, penguncian pan, webtoon, warna PDF, gulir dan mode paragraf. Controller dipindahkan ke BookModePanel; menu lama diganti launcher ringkas |
| Settings → TTS | Suara & bahasa → Suara & pembacaan | Sorotan/gaya/warna/granularitas, lewati anotasi inline, gaya pemutar/media metadata, cache/sinkron cache/batas cache; pengelola layanan khusus mengikuti ketersediaan aplikasi |
| Settings → Language | Suara & bahasa → Bahasa & terjemahan | Bahasa antarmuka, kamus dan pengelola kamus, WordLens, terjemahan/teks sumber/TTS sumber/provider/prompt/target, gaya font/ukuran/warna terjemahan, tanda kutip/konversi Mandarin sesuai bahasa, pengelola translator jika tersedia |
| Menu rak → Advanced | Data & aplikasi | Refresh metadata lokal, atur/ubah/nonaktifkan PIN |
| Settings → Behavior → Security/Privacy | Data & aplikasi | Izin JavaScript EPUB, persetujuan telemetri; kanal/updater tetap gated dan tidak ditambahkan ke web |
| Settings → Custom | Data & aplikasi → CSS khusus | Editor/validasi/terapkan CSS konten dan UI reader |
| Settings Menu tersembunyi | Segmen cakupan + aksi di halaman terkait | Semua buku/buku ini, reset halaman aktif, pengelola font/hapus font |
| Menu rak → Refresh/Fullscreen/Statistics | Menu rak ringkas | Refresh koleksi, layar penuh jika tersedia, statistik, Semua pengaturan |
| View Options → Fullscreen/Statistics/Share | Menu reader ringkas | Layar penuh, statistik, bagikan buku, Semua pengaturan |
| View Options → Auto Scroll/Speed Reading | Alat baca | Tindakan gulir otomatis dan baca cepat tetap langsung terjangkau |
| Reader → Font & Layout/Color | Panel cepat Tampilan | Ukuran huruf, pilihan font nyata, jarak baris, margin, warna halaman; Semua pengaturan membuka indeks baru |

## Cakupan dan kompatibilitas

Tidak ada migrasi format preferensi. `SystemSettings`, `ViewSettings`, `BookConfig`,
`isGlobal`, CFI, bookmark, catatan, serta kunci localStorage tetap dipakai.
`saveViewSettings` tetap menjadi jalur penyimpanan. Segmen Semua buku/Buku ini
menampilkan nilai `isGlobal` yang sesungguhnya. Bahasa UI, daftar font/kamus/layanan,
material solid, perangkat, privasi, cache, PIN, dan konfigurasi aplikasi global;
pilihan bacaan mengikuti cakupan yang didukung kontrol lama. Tema rak/reader dan
teksturnya mempunyai cakupan sendiri. Zoom/fit/spread/arah tulisan tetap khusus
buku sesuai controller sebelumnya. Reset bagian e-ink tidak mereset gestur,
anotasi, atau izin skrip. PIN dan data koleksi tidak menjadi target reset.

Permintaan panel lama dan ID command palette diterjemahkan oleh `navigation.ts`,
termasuk alias `settings.color.*` dan bagian Control yang dipisah. `lastConfigPanel`
tetap ditulis untuk kompatibilitas, sedangkan pembukaan normal menampilkan indeks.
Halaman tidak menyalin preferensi ke state baru yang tersimpan. Subhalaman kamus,
font, toolbar, pintasan, tema dan layanan menggunakan controller lama.

## Batas kemampuan web yang sudah ada

AI Assistant dan Integrations tidak ditampilkan sebelum update ini dan tetap tidak
diaktifkan. Tombol custom TTS/custom translator yang bergantung akun tetap mengikuti
gate lama. SDK native, brightness sistem, biometrik, always-on-top, folder data
native, cover lockscreen, cache manager native, updater native dan reopen-last
native tidak dihadirkan sebagai fitur web palsu. Kode layanan yang belum ditampilkan
tetap tersedia; tidak ada backend/account baru.

Pencarian isi buku, daftar isi, penanda, sorotan/catatan, notebook, terjemahan,
menjalankan TTS, gulir otomatis dan baca cepat adalah tindakan membaca, terpisah
dari preferensinya. Tab panel kini Isi/Catatan/Penanda dengan keyboard panah.
Mengetuk tab yang sedang aktif tidak menutup panel lagi.

## Identitas

Logo SVG orisinal menggambarkan dua halaman buku terbuka dengan satu `k` pada
masing-masing halaman. Berkas simbol/wordmark terang dan gelap ada di `public/brand`;
favicon SVG/ICO, ikon PWA 192/512, ikon kecil dan Apple Touch diperbarui.
Kontrol utama dan halaman pengaturan yang aktif menggunakan Lucide (ISC, dengan
bagian Feather MIT). Salinan pemberitahuan lisensinya disertakan di folder ini.
