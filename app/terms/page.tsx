import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Syarat layanan",
  description: "Aturan memakai Sararia Certificates untuk penyelenggara dan peserta.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Syarat layanan" updated="25 Oktober 2026">
      <section>
        <h2>Layanan</h2>
        <p>
          Sararia Certificates membantu penyelenggara membuat formulir, lalu menerbitkan sertifikat PDF bernomor untuk peserta yang
          mengisinya. Layanan ini gratis dan diberikan apa adanya.
        </p>
      </section>
      <section>
        <h2>Tanggung jawab penyelenggara</h2>
        <ul>
          <li>Penyelenggara menentukan siapa yang berhak menerima sertifikat dan bertanggung jawab atas isinya.</li>
          <li>Desain yang diunggah harus milik penyelenggara atau dipakai dengan izin pemiliknya.</li>
          <li>Penyelenggara memberi tahu pesertanya bahwa data mereka diproses lewat layanan ini.</li>
          <li>Dilarang memakai layanan untuk menerbitkan dokumen palsu, menyesatkan, atau melanggar hukum.</li>
        </ul>
      </section>
      <section>
        <h2>Peserta</h2>
        <p>
          Peserta mengisi data yang benar. Sertifikat diterbitkan atas nama yang diketik peserta, sehingga kesalahan ketik perlu dibetulkan
          lewat penyelenggara.
        </p>
      </section>
      <section>
        <h2>Pencabutan dan pembatasan</h2>
        <p>
          Penyelenggara dapat mencabut sertifikat yang pernah diterbitkan, dan halaman verifikasi akan menampilkannya sebagai dicabut. Kami
          dapat membatasi atau menutup akun yang menyalahgunakan layanan. Pengiriman email dibatasi per hari, tetapi PDF selalu bisa diunduh langsung.
        </p>
      </section>
      <section>
        <h2>Batas tanggung jawab</h2>
        <p>
          Kami berusaha menjaga layanan tetap berjalan, tetapi tidak menjamin tersedia tanpa gangguan. Simpan salinan sertifikat penting
          di tempat sendiri.
        </p>
      </section>
      <section>
        <h2>Data</h2>
        <p>
          Cara kami memperlakukan data dijelaskan di <Link href="/privacy" className="font-medium text-ink underline underline-offset-4">kebijakan privasi</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
