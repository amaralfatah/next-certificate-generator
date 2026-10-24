# Desain: Piagam sebagai formulir bersertifikat

> Disusun 2026-10-24. Mengubah arah produk dari `docs/01-prd.md` (alur "acara → template → form → publikasi") menjadi aplikasi formulir yang terasa seperti Google Forms, dengan sertifikat sebagai hasil otomatis. Bagian PRD yang tidak disebut di sini (PDF, penomoran, verifikasi, keamanan, penyimpanan, email) tetap berlaku.

## 1. Maksud

Piagam dipakai untuk **acara yang butuh sertifikat**: webinar, pelatihan, seminar. Tapi kedua penggunanya tidak boleh merasa sedang "mengurus sertifikat".

- **Peserta** merasa mengisi formulir biasa: buka link, jawab pertanyaan, tekan Kirim. Sertifikat muncul di akhir sebagai hadiah, bukan sebagai urusan yang harus diperiksa selama mengisi.
- **Penyelenggara** merasa membuat formulir biasa, dengan cara yang sesederhana Google Forms. Sertifikat sudah siap dengan desain bawaan, dan baru perlu disentuh kalau mau diubah.

Dari Google Forms yang diambil adalah *rasanya* (akrab, tanpa perlu belajar, isi lalu selesai), **bukan tampilannya**. Tampilan tetap mengikuti `DESIGN.md`: kanvas kertas hangat `#f6f5f4`, kartu putih dengan garis tipis, Inter, satu warna biru `#0075de` untuk aksi.

Aplikasinya harus simpel dan mudah dipakai, sambil tetap memenuhi kebutuhan penyelenggara.

## 2. Masalah pada alur sekarang

1. "Acara baru" langsung meminta desain sertifikat ("Lanjut ke template"), padahal ini langkah tersulit. Pertanyaan baru disusun di langkah ketiga.
2. Formulir hanya satu dari lima tab (Ringkasan, Template, Form, Pengaturan, Peserta), ditambah daftar periksa 5 langkah.
3. Bahasa antarmuka adalah bahasa sertifikat ("Dicetak di sertifikat", "Nomor sertifikat ABC-2026-00001 · ubah", "wajib, bawaan").
4. Jenis pertanyaan hanya teks, email, pilihan (dropdown), dan angka.
5. Tab "Peserta" adalah daftar sertifikat. Tidak ada ringkasan jawaban.
6. Publikasi adalah langkah terpisah di daftar periksa.
7. Peserta harus melewati langkah "Pastikan nama sudah benar" dengan pratinjau sertifikat sebelum mengirim.

## 3. Tujuan, bukan tujuan, dan yang harus dihindari

**Tujuan**
- Penyelenggara bisa membuat formulir dan membagikan link dalam 2 menit tanpa membuka editor sertifikat.
- Struktur editor yang langsung dipahami siapa pun yang pernah memakai Google Forms.
- Jenis pertanyaan yang cukup untuk daftar hadir dan evaluasi acara.
- Tab Respons yang menjawab "berapa yang hadir" dan "bagaimana jawaban mereka".
- Peserta tidak melihat kata "sertifikat" sampai formulir terkirim, kecuali satu petunjuk kecil di pertanyaan nama.

**Bukan tujuan (v1 perombakan ini)**
- Formulir tanpa sertifikat. Setiap formulir tetap menghasilkan sertifikat.
- Beberapa bagian/halaman (section), logika bersyarat, mode kuis/nilai, unggah file, kisi pilihan (grid).
- Tema warna per formulir, kolaborator, integrasi Google Sheets.
- Peserta mengubah jawaban setelah mengirim.

**Harus dihindari (gagal walau secara teknis jalan)**
- Penyelenggara terpaksa mendesain sertifikat sebelum bisa membagikan formulir.
- Peserta merasa sedang mengurus sertifikat (pratinjau sertifikat, nomor, atau QR sebelum mengirim).
- Editor menjadi lebih rumit dari Google Forms: pengaturan yang menumpuk di layar utama, wizard bertahap, daftar periksa.
- Tampilan meniru Google Forms (ungu, Roboto, material) alih-alih `DESIGN.md`.

## 4. Sisi penyelenggara

### 4.1 Dasbor: daftar formulir

- Judul halaman "Formulir". Setiap baris/kartu: judul, tanggal acara, jumlah respons, status (Draf, Menerima respons, Ditutup).
- Tombol "Formulir baru" **langsung membuat formulir** lalu membuka editornya. Tidak ada wizard. Nilai bawaan:
  - judul "Formulir tanpa judul", tanggal acara = hari ini, penyelenggara = nama akun;
  - dua pertanyaan: "Nama lengkap" (peran *nama*) dan "Email" (peran *email*);
  - desain sertifikat bawaan (preset `klasik` dari `lib/pdf/presets.ts`) dengan kolom yang sudah ditata;
  - awalan nomor sertifikat dibuat otomatis seperti sekarang.
- Menu per formulir: Duplikat, Hapus (pindah dari halaman Pengaturan, perilakunya sama).

### 4.2 Editor formulir

Kepala halaman: judul formulir (mengikuti judul di kartu kepala), status tersimpan, tombol **Pratinjau** (membuka halaman peserta, juga untuk draf milik sendiri), dan tombol utama **Bagikan**.

Tiga tab: **Pertanyaan · Respons · Sertifikat**, dengan jumlah respons di label tab Respons. Setelan ada di tombol/ikon terpisah di kepala halaman (panel atau halaman sendiri, pilihan pembangun).

#### Tab Pertanyaan

- **Kartu kepala**: judul, deskripsi, tanggal acara, penyelenggara, semuanya diedit langsung di tempat. Judul dan tanggal dipakai di sertifikat, tapi tidak ada label "dicetak di sertifikat" di sini.
- **Kartu pertanyaan**: klik untuk mengedit. Kartu yang sedang diedit menampilkan: teks pertanyaan, jenis, petunjuk (opsional), opsi (untuk jenis pilihan), sakelar Wajib, Duplikat, Hapus. Kartu lain tampil ringkas seperti yang akan dilihat peserta.
- Tambah pertanyaan dengan tombol di bawah daftar (atau di bawah kartu aktif). Urutan diubah dengan seret, plus tombol naik/turun untuk keyboard.
- **Jenis pertanyaan**: Jawaban singkat, Paragraf, Pilihan ganda, Kotak centang, Dropdown, Tanggal, Waktu, Skala linear (1–5 atau 1–10, dengan label ujung opsional), Angka, Email.
- **Pertanyaan berperan**: "Nama lengkap" punya peran *nama* (teksnya yang dicetak sebagai nama di sertifikat), dan "Email" punya peran *email* (dipakai untuk satu-respons-per-email dan pengiriman sertifikat). Keduanya selalu ada, selalu wajib, dan tidak bisa dihapus. Teks pertanyaan dan posisinya bisa diubah. Jenisnya terkunci. Kartu-kartu ini diberi tanda kecil yang menjelaskan perannya (mis. "Dipakai untuk nama di sertifikat").
- Perubahan tersimpan otomatis, seperti yang sudah berjalan di form builder sekarang.
- **Kode kehadiran**, kalau diaktifkan di Setelan, tampil di halaman peserta sebagai pertanyaan terakhir. Di editor, ia muncul sebagai kartu terkunci yang mengarah ke Setelan.

#### Tab Respons

- **Ringkasan**: total respons, lalu satu blok per pertanyaan:
  - pilihan ganda, kotak centang, dropdown, skala: batang horizontal dengan jumlah dan persen per opsi;
  - jawaban singkat, paragraf, angka, tanggal, waktu: daftar jawaban terbaru (maks 10, ada "lihat semua").
- **Per orang**: tabel yang sekarang ada di tab Peserta (cari, halaman, ekspor CSV, kirim ulang, cabut), dengan kolom jawaban. Status sertifikat dan email tetap tampil per baris.
- Sakelar **Menerima respons** ada di sini (seperti Google Forms) dan sama dengan status buka/tutup.

#### Tab Sertifikat

- Editor template yang sekarang (`components/editor/template-editor.tsx`), dipindah apa adanya. Pilih desain bawaan atau unggah gambar, seret kolom, atur font.
- Daftar kolom yang bisa ditaruh: Nama (dari pertanyaan berperan nama), Nama acara, Tanggal acara, Penyelenggara, Nomor, QR, dan pertanyaan lain berjenis jawaban singkat, dropdown, pilihan ganda, angka, tanggal.
- Aturan lama tetap berlaku: desain terkunci setelah ada sertifikat terbit (duplikat formulir untuk mengganti).

#### Setelan

Dipindah dari "Pengaturan" dan dari formulir "Acara baru": jadwal buka/tutup, kuota, kode kehadiran, awalan nomor sertifikat. Detail acara (judul, deskripsi, tanggal, penyelenggara) **tidak** ada di sini karena sudah diedit di kartu kepala.

#### Bagikan

- Draf: dialog "Bagikan" berisi tombol "Publikasikan & salin link". Setelah dipublikasikan, dialog menampilkan link, tombol Salin, dan QR yang bisa diunduh.
- Sudah dipublikasikan: dialog yang sama, langsung menampilkan link dan QR.
- Tidak ada daftar periksa. Satu-satunya penghalang publikasi adalah kalau desain sertifikat belum ada, yang tidak akan terjadi karena formulir baru selalu punya desain bawaan.
- Ringkasan & daftar periksa (`app/dasbor/acara/[id]/page.tsx`) dihapus.

## 5. Sisi peserta (`/f/[slug]`)

- Kepala: judul acara, deskripsi, penyelenggara, tanggal.
- Pertanyaan sesuai urutan dari editor, dengan tanda `*` merah untuk yang wajib dan catatan "* Wajib diisi". Tidak ada penyebutan sertifikat, kecuali petunjuk di pertanyaan berperan nama: "Tulis seperti yang ingin tercetak, termasuk gelar."
- Kontrol sesuai jenis: radio untuk pilihan ganda, kotak centang, `<select>` untuk dropdown, input tanggal/waktu bawaan, deretan tombol angka untuk skala, textarea untuk paragraf.
- Tombol **Kirim**, dan di sebelahnya "Kosongkan formulir".
- **Langkah "Pastikan nama sudah benar" dihapus.** Mengirim langsung memproses respons.
- Halaman terima kasih: "Jawabanmu sudah terkirim" dan "Terima kasih sudah hadir di {acara}". Lalu sertifikat sebagai hadiah: pratinjau dengan namanya, tombol "Unduh sertifikat", catatan salinan email (kalau email aktif), dan tautan verifikasi. Penanganan PDF gagal/coba lagi dan email duplikat ("kirim ulang ke email ini") tetap seperti sekarang, dengan kata-kata yang disesuaikan.
- Formulir belum dibuka, ditutup, atau kuota penuh: satu kartu penjelasan, seperti sekarang.
- Tampilan mengikuti `DESIGN.md`. Bentuk kartu per pertanyaan yang sudah ada di kode boleh dipertahankan selama terasa ringan.

## 6. Data

Tabel `events` tetap menjadi "formulir" di kode (nama tabel tidak diubah, hanya istilah di UI). Perubahan:

- `form_fields`
  - `type` enum menjadi: `short_text | paragraph | radio | checkbox | dropdown | date | time | scale | number | email`. Nilai lama dipetakan: `text → short_text`, `select → dropdown`, `email` dan `number` tetap.
  - kolom baru `role` (`name | email | null`), unik per formulir untuk nilai bukan null.
  - kolom baru `help` (teks petunjuk, default `""`).
  - kolom baru `config` jsonb untuk skala: `{ min, max, minLabel?, maxLabel? }`.
- Pertanyaan "Nama lengkap" dan "Email" menjadi baris `form_fields` dengan `role`. Migrasi membuat dua baris ini untuk setiap formulir yang sudah ada, di posisi paling atas.
- `submissions.name` dan `submissions.email` tetap ada dan diisi dari jawaban pertanyaan berperan, sehingga penomoran, keunikan email, verifikasi, dan CSV tidak berubah. Jawaban pertanyaan berperan tidak disimpan ganda di `answers`.
- `submissions.answers` menjadi `Record<string, string | string[]>`. Kotak centang menyimpan array.
- `template.fields[].key` untuk nama tetap `nama`.
- Migrasi Drizzle baru (`drizzle/0002_*`). Data lama hanya data uji lokal, jadi migrasinya cukup benar untuk data yang ada tanpa perlu strategi rollback.

Validasi (`lib/forms.ts`) diperluas per jenis: opsi harus ada di daftar (radio, dropdown, checkbox), tanggal `yyyy-mm-dd`, waktu `HH:mm`, skala bilangan bulat dalam rentang, paragraf maks 2000 karakter, lainnya tetap 200.

## 7. Rute

| Sekarang | Sesudah |
|---|---|
| `/dasbor` | `/dasbor` (daftar formulir) |
| `/dasbor/acara/baru` | dihapus (tombol langsung membuat) |
| `/dasbor/acara/[id]` (ringkasan) | `/dasbor/formulir/[id]` = tab Pertanyaan |
| `/dasbor/acara/[id]/form` | digabung ke tab Pertanyaan |
| `/dasbor/acara/[id]/peserta` | `/dasbor/formulir/[id]/respons` |
| `/dasbor/acara/[id]/template` | `/dasbor/formulir/[id]/sertifikat` |
| `/dasbor/acara/[id]/pengaturan` | `/dasbor/formulir/[id]/setelan` |

API di bawah `/api/dasbor/acara/[id]/…` ikut diganti nama ke `formulir`. `/f/[slug]`, `/v/[nomor]`, dan `/api/c/…` tidak berubah.

## 8. Yang tidak berubah

Pembuatan PDF, penomoran dan transaksinya, verifikasi dan QR, Turnstile, batas laju, hash kode kehadiran, penyimpanan R2/lokal, email Resend, login, dan aturan satu respons per email per formulir.

## 9. Pengujian

- Unit test validasi untuk setiap jenis pertanyaan baru, termasuk kotak centang (array) dan skala.
- Test alur submit yang sudah ada tetap lulus setelah nama/email berasal dari pertanyaan berperan.
- Test migrasi: formulir lama mendapat dua pertanyaan berperan, dan `text`/`select` terpetakan.
- Test agregasi ringkasan respons (hitungan per opsi, kotak centang dihitung per opsi).
- Cek manual di browser: buat formulir baru → bagikan → isi di ponsel (360px) → unduh sertifikat → lihat Respons.

## 10. Keputusan saya (bisa dikoreksi)

- Pertanyaan nama dan email selalu ada dan tidak bisa dihapus, karena sertifikat dan aturan satu-respons-per-email membutuhkannya.
- Langkah konfirmasi nama diganti dengan petunjuk di pertanyaan nama. Tidak ada perbaikan nama oleh peserta setelah mengirim. Salah ketik diperbaiki penyelenggara lewat "Hapus entri" lalu peserta mengisi ulang, seperti sekarang.
- Urutan tab: Pertanyaan · Respons · Sertifikat. Sertifikat paling akhir karena paling jarang diubah.
- Desain bawaan formulir baru: preset `klasik`.
- Rute diganti dari `acara` ke `formulir`. Nama tabel di database tidak diganti.
- Tidak ada bagian/halaman ganda di v1 ini.
- Nama produk tetap "Piagam" di UI. Penggantian ke "Sararia Certificates" adalah tugas terpisah.
- **Mengedit pertanyaan setelah ada respons boleh**, seperti Google Forms. Setiap pertanyaan punya `key` yang stabil sejak dibuat (tidak dibangun ulang dari teks pertanyaan), jadi mengganti teks tidak memutus jawaban lama. Jawaban milik pertanyaan yang dihapus tetap tersimpan, tapi tidak tampil di Ringkasan dan CSV. Ringkasan mengabaikan jawaban yang tidak cocok dengan opsi atau jenis sekarang. Setelah ada respons, pertanyaan yang dipasang di sertifikat tidak bisa dihapus dan jenisnya tidak bisa diganti, karena desain sertifikat terkunci.
- **Jumlah respons menghitung semua entri**, termasuk yang sertifikatnya dicabut. Cara memperbaiki salah ketik nama adalah "Hapus entri" (sudah ada), bukan cabut, sehingga tidak ada hitungan ganda.
- **Status**: Draf → (Bagikan) → Menerima respons ⇄ Ditutup. Sakelar "Menerima respons" hanya tampil setelah dipublikasikan: menyala = `open`, mati = `closed`. Jadwal dan kuota tetap menutup otomatis tanpa bisa dilewati sakelar. Kalau itu yang terjadi, di sebelah sakelar ada keterangan penyebabnya. Formulir tidak bisa kembali ke Draf.
- **Pratinjau hanya untuk melihat.** Tombol Kirim nonaktif, dengan keterangan "Ini pratinjau. Jawaban tidak dikirim." Ini berlaku juga untuk draf.

## 11. Diserahkan ke pembangun

- Bentuk visual kartu pertanyaan, dialog Bagikan, dan grafik ringkasan, selama mengikuti `DESIGN.md`.
- Pustaka seret-urut (atau tanpa pustaka), selama ada alternatif keyboard.
- Setelan sebagai panel geser atau halaman sendiri.
- Pembagian komponen dan modul.
