# Verifikasi Kata Kecil Reader Glass

Dikerjakan 29 Oktober 2026. Hasil ini berlaku untuk source dalam paket ini.

| Pemeriksaan | Hasil |
|---|---|
| Tes yang tersedia dalam paket (`pnpm test --run`) | 4 berkas, 14 tes lulus |
| TypeScript + Biome (`pnpm lint`) | Lulus; 1 catatan informasional upstream tentang inisialisasi undefined |
| Build produksi web (`pnpm build-web`) | Lulus, webpack + service worker Serwist |
| Route aplikasi | Beranda, koleksi, offline, reader, runtime config; endpoint akun/API upstream dikeluarkan |
| EPUB hasil backend dibuka parser Foliate asli | Lulus: judul, spine, dan daftar isi terbaca |
| Posisi baca dan bookmark pada pembaruan EPUB | Lulus uji migrasi saat sisipan/perubahan urutan atau penghapusan bagian |
| Bab mendatang | Tidak masuk ke katalog isi publik atau EPUB sebelum release_at |
| Saat waktu terbit tiba | Bagian tersedia, versi berubah, status buku tetap ongoing |
| Versi usang | Ditolak HTTP 409 |
| RLS anonymous | Draft dan isi mendatang tersembunyi; metadata jadwal tersedia |
| Publikasi anonymous | Ditolak HTTP 401 |
| Supabase Security Advisor | Tidak ada temuan pada proyek baru |
| Logo dan ikon | SVG dan PNG diperiksa; ikon web/native dihasilkan |
| Alat penerbitan EPUB Python | Sintaks dan dry-run terhadap EPUB uji lulus |

Tes awal untuk model status/progres dibuktikan gagal pada implementasi awal, lalu lulus setelah implementasi. Suite upstream besar/fixture yang memang tidak disertakan dalam ZIP awal tidak dipulihkan; angka 14 adalah tes dalam paket ini, bukan klaim seluruh suite Readest upstream.

Build masih mengeluarkan peringatan upstream Next.js tentang middleware yang akan beralih ke proxy, cache-control aset, dan referensi process.cwd pada bundle Edge. Build berhasil; tidak ada pengabaian error TypeScript/lint. Opsi penghematan memori webpack dan heap 4 GiB dipasang pada build script. Batas precache 16 MiB mencakup WASM pembaca.

## Batas verifikasi

- Browser cloud tidak dapat menjangkau server lokal. Tampilan visual, interaksi sentuh, dan perilaku offline penuh belum diuji langsung pada browser/perangkat; pemeriksaan CSS menggunakan DOM uji dan server produksi diperiksa melalui HTTP.
- APK belum dibuat/dipasang. Rust/Cargo dan Android SDK tidak tersedia. Konfigurasi identitas dan ikon native sudah diperbarui, tetapi build frontend/native Android belum diverifikasi.
- Studio dan novel pada proyek lama belum dipindahkan, karena akses baca database lama ditolak. Proyek baru tidak berisi salinan novel lama. Tool penerbitan dan kontrak RPC backend baru disertakan.
- Tidak ada deployment frontend ke domain publik dalam pekerjaan ini. Yang sudah aktif adalah database dan Edge Function Supabase khusus Kata Kecil.
- EPUB publik disusun ulang dari bagian terbit dan HTML dibersihkan. Stylesheet/DRM/fixed layout sumber tidak dipertahankan sebagai tampilan identik.

Semua buku pengujian sementara telah dihapus dari proyek baru sebelum penyerahan. Jangan menjalankan ulang `supabase/schema.sql` pada proyek yang sudah dipasang.
