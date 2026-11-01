# Temuan panel EPUB

Pemeriksaan read-only terhadap katalog/EPUB publik pada 1 November 2026.
Tidak ada perubahan Supabase, penerbitan, Storage, token, atau uploader.

EPUB Masa Panen (revision a77b3061d6ca846188c56e94b851ca4faae01ade0829992895f0f34e429a7fe3)
mengandung `OEBPS/nav.xhtml` dengan label literal:

```xml
<a href="section-39da3a29-8f2d-5e64-b381-793d81c8d391.xhtml">Masa Panen</a>
<a href="section-96200f1a-37a0-568f-9e3e-47f418bd5c5c.xhtml">Masa Panen</a>
<a href="section-0889022a-8524-5084-838b-0311aab5fbb4.xhtml">Episode 0Suara Mesin di Balik Terpal</a>
```

Jadi label menyatu dan dua nama pembuka yang sama ada pada sumber EPUB. Dua tautan
pembuka berbeda dan dipertahankan. UI memberi nama kontekstual “Bagian 1/2” pada
entri berulang yang persis sama dengan judul buku; label asli tetap ada pada title
serta nama aksesibilitas. Bab lain tidak digabung/dihapus/diubah tujuannya.
Episode/Bab/Chapter bernomor dipisahkan menjadi caption dan judul untuk tampilan
saja. Normalisasi yang sama dipakai pada label bab di header, hasil pencarian, grup
catatan, dan pemutar TTS. Metadata, href, CFI, struktur dokumen, serta isi EPUB
tidak ditulis ulang.
Backend dapat memperbaiki spasi label nav ketika membangun EPUB berikutnya.

`services/nav/locations.ts` menghitung `location.current` dari ukuran teks dibagi
`SIZE_PER_LOC`. Itu lokasi teks, bukan janji nomor halaman fisik atau layar.
Panel kini tidak menampilkan angka halaman untuk EPUB; PDF tetap menampilkan
halaman dari indeks halaman yang sah. Lokasi berbasis byte tetap digunakan mesin
reader, tetapi tidak diberi label halaman pada daftar isi. Ini juga menghindari
lonjakan lokasi akibat ukuran gambar dalam bagian pembuka.
Perhitungan mesin reader tidak diubah. “Posisi Saat Ini” memanggil CFI saat ini,
tidak menebak nomor. Badge bab aktif dibedakan dari progres.

Tinggi daftar sebelumnya dipaksa minimal 400 px. Kini daftar mengikuti ruang sisa
panel setelah header, kartu buku dan tab. Panel teks sepenuhnya pekat tanpa blur;
efek kaca tetap pada kontrol mengambang. Tab tidak lagi memiliki dua state + timer
300 ms; konfigurasi sideBarTab menjadi sumber utama. Pembukaan/penutupan tidak
mengirim navigasi buku. Fokus dibatasi pada overlay dan dikembalikan ketika ditutup;
Back browser Android menutup overlay dengan satu entri history sementara.

Mesin Foliate dan passive page mirror dari update-006 dipertahankan: halaman
terlihat menyusut ketika kontrol tampil, sementara ukuran mesin EPUB tidak berubah.

Bukti tambahan: bagian sampul `section-39da3a29…xhtml` berukuran 768.593 byte
dan memuat `data:image`; bagian judul berikutnya hanya 405 byte. Dengan pembagi
lokasi 1.500 byte, offset bagian kedua menjadi 512 (ditampilkan 513 oleh UI lama).
Itu menjelaskan angka pembuka besar tanpa menuduh ada ratusan halaman bacaan.
Memindahkan gambar inline ke aset EPUB adalah opsi bagi pembangun EPUB/backend;
frontend update ini tidak mengubah berkas EPUB, sumber jadwal, atau mesin lokasi.

Teks judul yang sudah menyatu di dalam isi EPUB tetap mengikuti sumber buku.
Normalisasi di sini berlaku pada UI navigasi; tidak menyisipkan/mengubah node teks
EPUB yang dapat menggeser CFI anotasi. Pemisahan markup judul isi dapat ditangani
pembangun EPUB pada pembaruan sumber berikutnya.
