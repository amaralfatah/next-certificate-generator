# PRD — Sararia Certificates: Form → Sertifikat Otomatis (next-piagam)

> 2026-10-24: nama produk diganti dari Piagam (nama kerja) menjadi **Sararia Certificates**, domain `certificates.sararia.com`. Penyebutan "Piagam" di bawah ini adalah catatan sejarah.

> Disusun: 2026-10-09. Keputusan diambil berdasarkan rekomendasi (pemilik mendelegasikan keputusan). Dokumen ini adalah sumber kebenaran untuk cakupan v1.

## 1. Latar Belakang

Penyelenggara webinar, pelatihan, seminar, sekolah, dan perusahaan sering membagikan sertifikat secara manual: mengumpulkan data peserta lewat Google Form, mengetik nama satu per satu di Canva, lalu mengirim lewat email atau WhatsApp. Prosesnya lambat, rawan salah ketik, dan sertifikatnya tidak bisa diverifikasi keasliannya.

**Piagam** membuat alur ini otomatis: peserta mengisi form, sertifikat PDF langsung jadi, bisa diunduh, dan dikirim ke email peserta. Setiap sertifikat punya nomor unik dan halaman verifikasi publik.

Piagam adalah salah satu aplikasi di katalog **Caang Labs** (lihat `next-caanglabs/docs/01-prd.md`).

## 2. Keputusan Kunci

| Topik | Keputusan | Alasan |
|---|---|---|
| Nama | **Piagam** (nama kerja) | Bahasa Indonesia untuk sertifikat/penghargaan, singkat |
| Pengguna | **Penyelenggara** (membuat acara, butuh akun) dan **peserta** (mengisi form, tanpa akun) | Peserta tidak boleh dibebani registrasi |
| Bentuk | Web app (Next.js, Vercel) | Penyelenggara bekerja di desktop, peserta di ponsel |
| Bahasa UI | Indonesia di v1, arsitektur siap i18n | Target awal penyelenggara lokal |
| Template | Penyelenggara mengunggah **gambar latar** (PNG/JPG, desain dari Canva dsb.), lalu menaruh kolom teks di atasnya lewat editor drag | Penyelenggara sudah punya desain; Piagam tidak perlu menjadi editor desain |
| Pembuatan PDF | Server-side dengan `pdf-lib` | Ringan, berjalan di serverless, hasil konsisten |
| Pengiriman | Unduh langsung setelah submit + email otomatis | Peserta tidak kehilangan sertifikat walau email gagal |
| Database | Neon Postgres | Stack yang sudah dipakai pemilik |
| Penyimpanan file | Cloudflare R2 (template dan PDF) | Tanpa biaya egress |
| Email | Resend (free tier) | API sederhana; batas free tier dicatat di §8 |
| Auth penyelenggara | Login Google (Neon Auth atau Auth.js, dipastikan saat plan) | Tanpa kelola password |
| Anti-penyalahgunaan | Cloudflare Turnstile + rate limit + **kode kehadiran** opsional | Mencegah orang yang tidak hadir mengambil sertifikat |

## 3. Alur Utama

### 3.1 Penyelenggara

1. Login dengan Google.
2. Buat acara: nama acara, tanggal, penyelenggara, deskripsi singkat.
3. Unggah gambar latar sertifikat (A4 landscape/portrait, PNG/JPG, maks 5 MB).
4. Taruh kolom di atas template lewat editor: `{nama}`, `{acara}`, `{tanggal}`, `{nomor}`, `{qr}`, serta kolom kustom dari form. Atur font, ukuran, warna, perataan.
5. Susun form peserta: nama (wajib, selalu ada), email (wajib), dan kolom tambahan (teks, pilihan, angka).
6. Atur pengaman: kode kehadiran (opsional), tanggal buka/tutup form, kuota maksimum.
7. Pratinjau sertifikat dengan data contoh, lalu publikasikan dan dapatkan link publik (`/f/<kode-acara>`) beserta QR code.
8. Pantau daftar peserta, ekspor CSV, kirim ulang sertifikat, atau cabut sertifikat.

### 3.2 Peserta

1. Buka link atau scan QR.
2. Isi form (+ kode kehadiran jika diwajibkan).
3. Lihat pratinjau nama sebelum konfirmasi ("Pastikan nama sudah benar, nama tidak bisa diubah setelah dikirim").
4. Submit, lalu sertifikat langsung bisa diunduh. Salinannya dikirim ke email.

### 3.3 Verifikasi

Setiap sertifikat memuat nomor unik dan QR yang mengarah ke `/v/<nomor>`. Halaman ini menampilkan nama penerima, acara, tanggal, penyelenggara, dan status (valid atau dicabut). Email dan data form lainnya tidak ditampilkan.

## 4. Cakupan v1

### 4.1 Termasuk

- Akun penyelenggara, CRUD acara.
- Editor penempatan kolom di atas template (drag, resize, font dari daftar Google Fonts terkurasi).
- Form builder sederhana (teks, email, pilihan, angka).
- Pembuatan PDF, unduh langsung, kirim email.
- Halaman verifikasi publik + QR.
- Dashboard peserta: daftar, cari, ekspor CSV, kirim ulang, cabut.
- Pengaman: Turnstile, rate limit per IP, kode kehadiran, jadwal buka/tutup, kuota, satu sertifikat per email per acara.

### 4.2 Tidak termasuk (Roadmap)

Generate massal dari CSV, pengiriman via WhatsApp, pembayaran/acara berbayar, tim penyelenggara (multi-admin), custom domain, integrasi Google Forms, editor desain dari nol, tanda tangan digital tersertifikasi.

## 5. Model Data

```
organizers       id, email, name, created_at
events           id, organizer_id, slug, title, date, organizer_label,
                 status (draft|open|closed), opens_at, closes_at, quota,
                 attendance_code_hash, number_prefix, created_at
templates        id, event_id, background_key (R2), width_pt, height_pt,
                 fields jsonb   -- [{key, x, y, w, font, size, color, align}]
form_fields      id, event_id, key, label, type, required, options jsonb, position
submissions      id, event_id, name, email, answers jsonb, ip_hash, created_at
                 UNIQUE (event_id, lower(email))
certificates     id, submission_id, number (unik global), pdf_key (R2),
                 status (valid|revoked), emailed_at, created_at
```

- Nomor sertifikat: `<number_prefix>-<tahun>-<urutan 5 digit>`, mis. `WBN-2026-00042`. Urutan dihitung per acara di dalam transaksi agar tidak ganda.
- Kode kehadiran disimpan sebagai hash.
- IP disimpan sebagai hash, hanya untuk rate limit.

## 6. Arsitektur Teknis

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui, Drizzle ORM, Neon Postgres, Cloudflare R2 (S3 API), `pdf-lib` + `@pdf-lib/fontkit`, Resend, Cloudflare Turnstile.
- **Pembuatan PDF:** Route Handler menerima submission, membuat PDF dari latar + kolom, mengunggah ke R2, lalu mengembalikan URL unduh bertanda tangan (signed URL, berlaku singkat). Email dikirim setelah PDF tersimpan; kegagalan email tidak menggagalkan submit.
- **Koordinat editor:** disimpan dalam satuan point PDF (pt), bukan pixel layar, sehingga hasil PDF identik dengan pratinjau di semua ukuran layar.
- **Font:** file font disimpan di repo (subset Latin), di-embed ke PDF. Nama dengan karakter non-Latin dicatat sebagai keterbatasan v1.
- **Modul:** `lib/pdf/` (render sertifikat, fungsi murni yang bisa dites), `lib/storage/` (R2), `lib/mail/` (Resend), `lib/db/` (Drizzle schema + query). Route handler hanya merangkai modul-modul ini.

## 7. Kasus Tepi dan Penanganan Error

| Kondisi | Perilaku |
|---|---|
| Email sudah pernah submit di acara yang sama | Tidak membuat sertifikat baru; tawarkan "Kirim ulang ke email ini" |
| Form ditutup / kuota habis | Halaman form menampilkan status; submit ditolak di server |
| Kode kehadiran salah | Ditolak; 5 kali salah per IP per 10 menit → diblokir sementara |
| Nama sangat panjang | Font otomatis diperkecil hingga muat di lebar kolom; batas 80 karakter |
| Pembuatan PDF gagal | Submission tetap tersimpan, status `pending`; peserta melihat pesan dan tombol coba lagi; penyelenggara melihat status di dashboard |
| Email gagal / kuota Resend habis | Sertifikat tetap bisa diunduh; status email `failed`; penyelenggara bisa kirim ulang |
| Sertifikat dicabut | Halaman verifikasi menampilkan "Dicabut"; PDF tidak lagi bisa diunduh |
| Template diganti setelah ada peserta | Diblokir setelah ada sertifikat terbit; penyelenggara harus menduplikasi acara |

## 8. Kebutuhan Non-fungsional

- **Biaya v1:** Rp0 di free tier (Vercel Hobby, Neon free, R2 free 10 GB, Resend free).
- **Batas free tier Resend** (± 100 email/hari, 3.000/bulan; dicek ulang saat implementasi): cukup untuk acara kecil-menengah. Ditampilkan di dashboard penyelenggara. Unduh langsung menjadi jalur utama, email sebagai cadangan.
- **Performa:** sertifikat siap diunduh < 5 detik setelah submit.
- **Privasi:** data peserta hanya dapat dilihat penyelenggara acara itu. Penyelenggara bisa menghapus acara beserta semua datanya. Privacy policy di Caang Labs menjelaskan peran Piagam sebagai pemroses data atas nama penyelenggara (selaras UU PDP No. 27/2022).
- **Keamanan:** setiap query dashboard difilter `organizer_id` dari sesi; file R2 privat, akses lewat signed URL; validasi semua input di server.
- **Responsif:** form peserta dioptimalkan untuk ponsel (360px). Editor template ditujukan untuk desktop (≥ 1024px), dengan pesan di layar kecil.

## 9. Pengujian

- Unit test `lib/pdf/`: posisi kolom, penyusutan font nama panjang, format nomor.
- Integration test alur submit: duplikat email, kuota, form tutup, kode kehadiran salah.
- Test penomoran paralel: 20 submit bersamaan tidak menghasilkan nomor ganda.
- Cek manual: pratinjau editor vs PDF hasil di beberapa ukuran template.

## 10. Kriteria Sukses v1

1. Penyelenggara bisa dari nol sampai link form terpublikasi dalam < 10 menit.
2. Peserta menerima sertifikat yang bisa diunduh dalam < 5 detik setelah submit.
3. Setiap sertifikat bisa diverifikasi lewat QR.
4. Satu acara dengan 300 peserta berjalan tanpa nomor ganda dan tanpa biaya.

## 11. Roadmap

| Versi | Isi |
|---|---|
| v1.1 | Generate massal dari CSV (untuk peserta yang tidak mengisi form) |
| v1.2 | Kirim via WhatsApp (link unduh), multi-admin per acara |
| v2 | Paket berbayar untuk kuota email besar, custom domain, branding tanpa watermark |
| v2+ | Tanda tangan digital, integrasi Google Forms |

## 12. Pertanyaan Terbuka

- Nama final aplikasi (cek merek dagang dan domain/subdomain, mis. `piagam.caanglabs.com`).
- Pilihan auth final (Neon Auth vs Auth.js) — diputuskan saat menyusun plan setelah cek dokumentasi terbaru.
- Apakah sertifikat v1 diberi watermark kecil "dibuat dengan Piagam" (rekomendasi: ya, kecil di pojok, sebagai promosi gratis).
