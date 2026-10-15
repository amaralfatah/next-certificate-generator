# Piagam

Form → sertifikat otomatis. Peserta mengisi form, sertifikat PDF bernomor unik langsung bisa diunduh, salinannya dikirim ke email, dan keasliannya bisa dicek lewat QR di `/v/<nomor>`. Bagian dari Caang Labs. Spesifikasi lengkap: [docs/01-prd.md](docs/01-prd.md).

## Menjalankan

```bash
npm install
npm run dev
```

Tanpa konfigurasi apa pun aplikasi langsung jalan: database PGlite di `.data/pglite`, file di `.data/files`, login dev dengan email, email dicatat ke konsol, Turnstile dilewati. Isi `.env.local` (lihat [.env.example](.env.example)) untuk memakai layanan sungguhan.

Dengan Postgres (lokal atau Neon), jalankan migrasi sekali:

```bash
npm run db:migrate
```

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm test` | Unit + integrasi (PGlite in-memory) |
| `TEST_DATABASE_URL=postgres://… npm test` | Ikut menjalankan uji konkurensi di Postgres sungguhan |
| `npm run typecheck` / `npm run lint` | Pemeriksaan tipe dan lint |
| `npm run db:generate` | Buat migrasi SQL baru setelah mengubah `lib/db/schema.ts` |
| `npm run fonts` | Unduh ulang font sertifikat ke `public/fonts` (lalu `node scripts/font-metrics.mjs`) |

## Struktur

```
app/
  page.tsx                  landing
  masuk/                    login (Google, atau dev login lokal)
  dasbor/                   dashboard penyelenggara (dilindungi sesi)
    acara/[id]/             ringkasan · template · form · pengaturan · peserta
  f/[slug]/                 form peserta (publik, mobile-first)
  v/, v/[number]/           verifikasi sertifikat (publik)
  api/f/[slug]/submit       submit form → nomor → PDF → email (after())
  api/c/[number]            gerbang unduh (token bertanda tangan, cek status dicabut)
lib/
  pdf/                      render sertifikat (pdf-lib, fungsi murni + tes)
  certificates/             submit (transaksi + penomoran), issue (PDF, email)
  db/                       skema Drizzle + klien (Neon / pg / PGlite)
  storage/                  R2 (aws4fetch) atau file lokal, URL bertanda tangan
  mail/                     Resend
  security/                 hash, token, rate limit (Postgres), Turnstile
  auth/                     sesi JWT (jose) + Google OAuth (arctic)
```

## Keputusan teknis

- **Template bawaan berbasis vektor** (`lib/pdf/presets.ts`: Klasik, Modern, Ceria; slide 16:9). Satu daftar bentuk digambar ke SVG di editor/landing/form dan ke pdf-lib di PDF, jadi penyelenggara tanpa desain sendiri bisa terbit dalam satu klik, dan hasilnya tajam di PDF.
- **Teks editor = teks PDF.** Editor menggambar teks di SVG memakai file font dan metrik ascent/descent yang sama dengan renderer (`lib/font-metrics.json`, dibuat oleh `node scripts/font-metrics.mjs`). Renderer tidak memakai `heightAtSize` pdf-lib karena salah skala untuk font dengan unitsPerEm ≠ 1000.
- **Koordinat editor dalam point PDF.** Kolom teks menyimpan `x`, `w` dan `y` sebagai garis tengah kotak glyph, sehingga posisinya identik di semua ukuran layar.
- **Ukuran halaman mengikuti gambar latar.** Rasio 16:9 (slide PowerPoint/Canva) → 960 × 540 pt, 4:3 → 720 × 540 pt, A4 → 842 × 595 pt, Letter → 792 × 612 pt; rasio lain tetap proporsional dengan sisi panjang 842 pt.
- **Penomoran bebas bentrok.** `UPDATE events SET cert_seq = cert_seq + 1 … RETURNING` di dalam transaksi submit mengunci baris acara, sehingga nomor dan kuota tetap tepat saat banyak peserta submit bersamaan (diuji 20 submit paralel di PGlite dan Postgres).
- **Prefix nomor unik global** agar nomor `PREFIX-TAHUN-URUTAN` tidak pernah sama antar acara.
- **Unggah langsung ke storage** lewat signed PUT URL (batas body fungsi Vercel 4,5 MB < batas gambar 5 MB). Untuk R2, atur CORS bucket agar mengizinkan `PUT` dari domain aplikasi dengan header `content-type`.
- **Template dan form terkunci** setelah sertifikat pertama terbit; gunakan *Duplikat acara*.
- **Salah ketik nama:** penyelenggara menghapus entri peserta (menu Peserta → Hapus entri), lalu peserta mengisi ulang dengan email yang sama.
- **Kegagalan tidak menghilangkan data.** PDF gagal → sertifikat berstatus tertunda, peserta dan penyelenggara bisa coba lagi. Email gagal → status `failed`, bisa kirim ulang.
- **Privasi.** Halaman verifikasi hanya menampilkan nama, acara, tanggal, penyelenggara, nomor. IP disimpan sebagai hash. Kode kehadiran disimpan dengan scrypt.

## Keterbatasan v1

- Font sertifikat berisi subset Latin. Nama dengan aksara non-Latin (Arab, Jawa, CJK) belum didukung.
- Bahasa UI hanya Indonesia; format tanggal/angka lewat `lib/i18n.ts`.
- Batas email harian mengikuti free tier Resend (100/hari); unduh langsung tetap jalur utama.
