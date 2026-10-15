import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "Piagam: peserta isi form, sertifikat langsung jadi";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    eyebrow: "Sertifikat otomatis untuk acaramu",
    title: "Peserta isi form, sertifikat langsung jadi.",
    footer: "Gratis, dan peserta tidak perlu membuat akun",
  });
}
