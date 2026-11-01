# Kata Kecil — Penerbit Termux

Ketik `kk` untuk membuka menu. Alat ini mandiri dan hanya memerlukan Python 3.10+.
Tidak perlu membuka repo atau menjalankan server di HP.

## Instalasi

```bash
pkg install python
sh install.sh
kk
```

Installer menyimpan program di `~/katakecil-publisher/kk.py`, membuat perintah
`kk` di direktori bin Termux, dan menyimpan konfigurasi pribadi pada
`~/.config/katakecil/config.json` dengan izin 0600. Installer mempertahankan folder
terakhir dan pengaturan yang sudah ada. Paket pribadi menyertakan aktivasi;
source publik tidak menyertakan token penerbit.

## Upload EPUB

1. Pilih Upload EPUB.
2. Pilih file dari Download, atau gunakan `l` untuk lokasi lain.
3. Periksa judul, penulis, sampul, dan susunan isi.
4. Pilih terbit lengkap, bertahap, atau draf.
5. Tinjau jadwal dan konfirmasi simpan.

Daftar hanya memuat `.epub` (termasuk `.EPUB`) dan folder yang langsung berisi EPUB.
Gambar, video, PDF, serta ZIP tidak dimuat. Daftar membaca metadata direktori,
bukan membuka semua file. Pemindaian anak folder hanya sedalam satu tingkat;
gunakan `s` untuk pencarian rekursif di folder pilihan. Symlink tidak diikuti.
Gunakan `/nama` untuk pencarian dan `n`/`p` untuk halaman berikut/sebelumnya.

Metadata dan sampul raster dibaca dari EPUB. Sampul JPG/PNG/WebP dapat diganti
dengan file lokal. Judul, penulis, sinopsis, bahasa, dan status dapat diedit.
EPUB asli tidak dipindahkan atau dihapus.

## Jadwal episode

Preset Kamis dan Minggu pukul 19.00 WIB; hari, jam, tanggal mulai, jumlah episode
awal, serta jumlah episode per rilis bisa diubah. Jadwal disimpan ke Supabase;
Termux boleh ditutup setelah unggahan selesai. Bagian yang belum waktunya terbit
tidak dimasukkan ke EPUB publik. Pembaca perlu menyegarkan koleksi untuk mengambil
rilis baru; buku offline memakai versi yang terakhir diunduh.

Halaman judul, pengantar, dan daftar isi dipertahankan sebagai halaman buku.
Identifikasi otomatis memakai penanda EPUB dan nama file. Gunakan Tinjau isi
untuk mengoreksi klasifikasi halaman/episode sebelum menjadwalkan. Halaman buku
tidak memakai jatah episode per rilis. Jadwal khusus satu bagian juga bisa diubah.

## Revisi

Pilih Update cerita lalu EPUB lengkap revisinya. Buku tetap memakai ID lama.
Bagian dicocokkan memakai ID/path EPUB, lalu judul yang unik bila path berubah.
Judul ganda yang tidak bisa dicocokkan akan menghentikan proses. Jadwal lama
dipertahankan, sedangkan bagian baru ditahan sampai diaktifkan/dijadwalkan.
Penghapusan bagian memerlukan konfirmasi tambahan. Perubahan bersamaan dari
versi buku lama ditolak agar tidak menimpa revisi yang lebih baru.

Mencocokkan ID bagian membantu mempertahankan lokasi baca. Perubahan teks atau
struktur besar tetap dapat menggeser CFI/bookmark; jangan menganggap semua posisi
lama selalu menunjuk kalimat yang sama setelah naskah direvisi.

## Batas format

EPUB reflowable maksimal 18 MB, 600 bagian, dan 70 MB setelah dekompresi. Satu
bagian maksimal 3 MB; gambar isi maksimal 1,5 MB; sampul maksimal 5 MB. EPUB DRM,
encrypted, fixed-layout, script, dan sumber eksternal tidak didukung oleh jalur
penerbitan ini. Isi disanitasi dan dirakit menjadi EPUB publik dengan format
reader. CSS/font EPUB asli tidak dijamin dipertahankan persis.

## Akses dan diagnosis

Token penerbit hanya mengizinkan operasi penerbit Kata Kecil melalui Edge
Function khusus. Token bukan kunci admin Supabase. Jangan membagikan paket pribadi
atau memasukkan file aktivasi ke Git. Token bisa dicabut melalui tabel
`kk_publisher_tokens` dengan mengubah `is_enabled=false`.

```bash
kk --check
kk --inspect "$HOME/storage/shared/Download/Cerita.epub"
kk --version
```

Kegagalan koneksi dapat dicoba ulang. Jika respons akhir terputus, periksa koleksi
dahulu: backend menyimpan perubahan secara atomik dan mencegah publikasi ganda
untuk permintaan yang sama. Berkas asli di HP tetap tersedia.
