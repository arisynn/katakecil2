# Kata Kecil — Reader Glass + Supabase khusus

Paket ini sudah dimodifikasi dari source Readest yang sebelumnya diberikan. Ini **source aplikasi**, bukan APK atau frontend yang sudah dipublikasikan.

## Yang sudah diterapkan

- White Glass / Black Glass memakai palet pengguna: toolbar, panel, menu, dialog, sidebar, notebook; fallback tanpa blur untuk e-ink dan perangkat yang tidak mendukung backdrop-filter.
- Halaman teks tetap memakai mesin Readest/Foliate. Warna halaman baca dapat dipilih terpisah dari tampilan aplikasi.
- Koleksi berasal dari proyek Supabase khusus `katakecil` di Singapura, ref `hrbcwymdqigtfmpmsdsi`.
- Status ongoing/tamat/jeda mengikuti metadata backend, terpisah dari progres selesai membaca.
- Jadwal berikutnya berasal dari database. Bagian mendatang tidak masuk ke EPUB publik.
- Pembaruan versi memigrasikan posisi teks dan bookmark melalui identitas buku/bagian yang stabil.
- Login pembaca, impor pengguna, layanan akun, dan menu sinkronisasi cloud dilepas dari alur aplikasi. Sebanyak 83 berkas entry route akun, impor, layanan API upstream, dan halaman tambahan sudah dikeluarkan; helper yang masih diperlukan reader dipertahankan.
- Identitas Kata Kecil: monogram k/halaman, favicon, ikon web dan native. Lisensi upstream tetap disertakan.

## Jalankan web

Dari root paket:

```bash
pnpm install --frozen-lockfile
pnpm --filter @readest/readest-app setup-vendors
cd apps/readest-app
pnpm dev-web
```

Build produksi: `pnpm build-web`. Build menggunakan webpack agar service worker Serwist ikut dibuat.

Konfigurasi URL dan publishable key proyek baru sudah tersedia dalam `.env` dan konfigurasi publik aplikasi. Tidak ada secret/service-role key dalam paket. Jika memakai host dengan environment sendiri, sesuaikan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` ke proyek baru; nilai host dapat mengalahkan `.env`.

## Backend yang sudah dipasang

SQL sudah dijalankan pada proyek baru. **Jangan jalankan ulang schema.sql pada proyek tersebut.** `apps/readest-app/supabase/schema.sql` adalah skema akhir untuk referensi atau pemasangan pada proyek kosong lain.

Edge Function `katakecil-reader` sudah aktif. Source dan import map ada di `apps/readest-app/supabase/functions/katakecil-reader/`. Hanya publishable key dipakai oleh reader. Secret server tetap di environment Supabase.

Tabel `kk_books`, `kk_sections`, `kk_release_schedule`, dan `kk_author_members` memisahkan metadata, isi, jadwal, dan penulis yang berwenang. Semua tabel memakai RLS. Sumber EPUB utuh berada di bucket privat `kk-sources`; reader menerima EPUB yang disusun ulang dari bagian terbit saja.

## Terbitkan EPUB

Alat penerbitan berada di `apps/readest-app/scripts/katakecil/publish_epub.py`, memakai Python standar tanpa dependency tambahan.

```bash
python scripts/katakecil/publish_epub.py buku.epub --id identitas-buku --dry-run
python scripts/katakecil/publish_epub.py buku.epub --id identitas-buku --status ongoing
```

Untuk penerbitan sungguhan, atur `KATAKECIL_PUBLISHER_KEY` ke secret/service-role key proyek baru **di mesin penerbit saja**. Jangan masukkan key ini ke frontend, ZIP, Git, atau variabel `NEXT_PUBLIC_*`. Script tidak menyimpan key.

- Gunakan ID buku yang sama setiap pembaruan.
- `--status ongoing|completed|hiatus` menentukan status penerbitan; progres pembaca tidak mengubahnya.
- `--draft` menyimpan buku tanpa menampilkannya kepada publik.
- `--cover-url https://...` memasang sampul.
- `--schedule jadwal.json` menerima objek JSON dari path spine EPUB ke waktu ISO dengan zona, contoh `{"OEBPS/bab-2.xhtml":"2026-11-01T19:00:00+07:00"}`.
- Path yang tidak diberi jadwal diterbitkan saat perintah dijalankan. **Selalu sertakan jadwal kembali ketika memperbarui buku yang masih memiliki bagian mendatang.**
- Penerbitan adalah snapshot lengkap: bagian yang tidak ada pada EPUB baru dikeluarkan. Uji `--dry-run` dahulu.
- EPUB mengalir/reflowable didukung; DRM dan fixed layout ditolak. Gambar raster lokal di-inline agar reader tidak melacak pembaca melalui resource luar. Tata letak publik dinormalisasi untuk pembacaan, bukan salinan visual identik stylesheet EPUB sumber.

## Studio dan buku lama

**Studio lama dan buku lama belum dipindahkan.** Koneksi menolak akses database proyek lama ketika pekerjaan ini berjalan. Tidak ada isi novel yang ditebak atau dipindahkan tanpa dibaca. Proyek baru bersih; data uji sementara dibersihkan setelah verifikasi.

Source Studio penulis tidak ada dalam ZIP ini. Studio lama memakai skema `qr_*`, sedangkan backend khusus baru memakai `kk_*`. Mengganti environment Studio saja tidak cukup. Studio perlu diadaptasi ke RPC `kk_publish_book(book, sections)` atau memakai alat penerbitan di atas. Jangan menimpa skema Studio lama dengan schema.sql ini.

## Android

Identitas aplikasi menjadi `id.katakecil.reader`, nama Kata Kecil, ikon native sudah diganti. Build frontend native memakai `pnpm build`, kemudian toolchain Rust/Android serta `pnpm tauri android init` dan `pnpm tauri android build` sesuai CONTRIBUTING. APK belum dibuat atau diuji pada perangkat karena toolchain Rust/Android tidak tersedia di lingkungan pekerjaan ini.

## Verifikasi

Lihat `KATAKECIL_VALIDASI.md` untuk hasil akhir dan batas pengujian. Catatan hash/provenance lama dalam `kata-kecil-notes` mendeskripsikan baseline upstream, bukan klaim bahwa source modifikasi ini identik upstream. Daftar perubahan aktual disertakan dalam `kata-kecil-notes/KATAKECIL_CHANGES.json`.

Readest upstream: https://github.com/readest/readest/tree/578b50fa7e2064ac3da6d1b082a90541394c6a75
Lisensi AGPL dan lisensi setiap komponen tetap berlaku. Ketika mendistribusikan aplikasi/web modifikasi, sediakan akses source modifikasi sesuai ketentuan lisensi.
