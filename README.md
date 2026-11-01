# Kata Kecil — Web & PWA

Reader Kata Kecil berbasis Readest. Rak buku, pencarian, pengaturan, reader EPUB/PDF,
bookmark, serta penyimpanan posisi baca memakai komponen Readest. Koleksi berasal
dari Supabase; pembaca tidak perlu login atau mengimpor buku. Tema kaca mengikuti
pilihan palet aplikasi.

Repo ini hanya menghasilkan website Next.js dan PWA. Kode aplikasi Rust/Tauri,
Android, iOS, installer desktop, serta workflow rilis native sudah dilepas.
Versi hybrid tetap tersedia pada commit `e597cfa` dan tag cadangan sebelum update.

## Menjalankan web

Gunakan Node.js 24 dan pnpm sesuai `packageManager` dalam `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm --filter @readest/readest-app setup-vendors
pnpm dev
```

```bash
pnpm build
pnpm start
```

Vercel memakai satu layanan Next.js di `apps/readest-app`, sesuai `vercel.json`.
Tidak ada backend native atau proses tambahan. `src/proxy.ts` menggunakan Node.js.
Koneksi katalog dan EPUB mengarah ke Supabase Edge Function `katakecil-reader`.
Konfigurasi runtime publik tersedia melalui `/runtime-config.js`.

## Struktur

| Lokasi | Isi |
|---|---|
| `apps/readest-app` | Aplikasi Next.js, reader, tema, PWA |
| `apps/readest-app/supabase` | Skema dan Edge Functions katalog/penerbit |
| `packages/foliate-js` | Mesin pembaca buku di browser |
| `packages/simplecc-wasm/dist/web` | WASM konversi tulisan yang digunakan browser |
| `packages/js-mdict` | Pembaca kamus |
| `tools/katakecil-publisher` | Source alat penerbit Termux mandiri |

Modul Readest bersama masih mempunyai beberapa nama kemampuan platform lama.
`src/platform/browser` meneruskan kemampuan yang tersedia ke API browser dan
menolak kemampuan OS yang tidak tersedia. Tidak ada SDK/plugin Tauri yang
diinstal atau runtime native yang diperlukan. Penyimpanan buku menggunakan
IndexedDB; database statistik tetap memakai WASM browser.

## Penerbit Termux

Alat `kk` memakai Python standard library dan dipasang ke `~/katakecil-publisher`.
Perintah `kk` tersedia dari folder mana pun. Pengoperasiannya tidak memerlukan
Node.js, pnpm, atau clone repo di HP.

Lihat [panduan penerbit](tools/katakecil-publisher/README.md). File aktivasi pribadi
tidak disimpan di Git dan tidak termasuk source publik ini.

## Pemeriksaan

```bash
pnpm test --run
pnpm lint
pnpm test:publisher
pnpm build
```

## Lisensi

Modifikasi dari [Readest](https://github.com/readest/readest), GPL-3.0, sesuai
[LICENSE](LICENSE). Foliate dan dependency lain tetap memakai lisensi masing-masing.
Lisensi OpenCC dipertahankan bersama distribusi WASM browser.
