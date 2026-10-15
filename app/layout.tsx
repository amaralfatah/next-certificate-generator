import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  variable: "--font-display-face",
});
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Piagam: peserta isi form, sertifikat langsung jadi", template: "%s · Piagam" },
  description:
    "Peserta mengisi form, sertifikat PDF langsung jadi, terkirim ke email, dan bisa diverifikasi lewat QR. Bagian dari Caang Labs.",
  applicationName: "Piagam",
};

export const viewport: Viewport = {
  themeColor: "#f7f2e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
