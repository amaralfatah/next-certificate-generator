import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Kebijakan privasi",
  description: "Data apa yang dikumpulkan Sararia Certificates, untuk apa, dan siapa yang bisa melihatnya.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Kebijakan privasi" updated="25 Oktober 2026">
      <section>
        <h2>Peran kami</h2>
        <p>
          Untuk data peserta, penyelenggara acara adalah pengendali data dan Sararia Certificates memprosesnya atas nama penyelenggara.
          Untuk akun penyelenggara, kami sendiri yang mengelola datanya.
        </p>
      </section>
      <section>
        <h2>Data yang kami simpan</h2>
        <ul>
          <li>Penyelenggara: nama, alamat email, dan foto profil dari akun Google yang dipakai masuk.</li>
          <li>Peserta: nama, email, dan isian lain yang diminta formulir penyelenggara, beserta nomor dan waktu penerbitan sertifikat.</li>
          <li>Berkas desain sertifikat yang diunggah penyelenggara.</li>
          <li>Cookie sesi untuk penyelenggara yang sedang masuk. Peserta tidak memakai akun.</li>
        </ul>
      </section>
      <section>
        <h2>Untuk apa</h2>
        <p>
          Membuat dan mengirim sertifikat, menampilkan daftar peserta kepada penyelenggara, memverifikasi keaslian sertifikat, dan mencegah
          penyalahgunaan formulir (batas kuota, satu sertifikat per email, dan pemeriksaan anti-bot Cloudflare Turnstile).
        </p>
      </section>
      <section>
        <h2>Siapa yang bisa melihat</h2>
        <p>
          Data peserta hanya bisa dilihat penyelenggara acara yang bersangkutan. Halaman verifikasi publik hanya menampilkan nama, acara,
          tanggal, penyelenggara, dan nomor sertifikat. Email peserta tidak ditampilkan di sana.
        </p>
      </section>
      <section>
        <h2>Pihak ketiga</h2>
        <p>
          Kami memakai Google (masuk penyelenggara), penyedia email (Gmail SMTP atau Resend), Cloudflare (penyimpanan berkas dan Turnstile), dan penyedia
          basis data. Mereka menerima data seperlunya untuk menjalankan fungsinya. Kami tidak menjual data dan tidak memakainya untuk iklan.
        </p>
      </section>
      <section>
        <h2>Penghapusan</h2>
        <p>
          Penyelenggara dapat menghapus formulir beserta seluruh responsnya dari akunnya. Peserta yang ingin datanya dihapus dapat meminta
          lewat penyelenggara acara.
        </p>
      </section>
    </LegalPage>
  );
}
