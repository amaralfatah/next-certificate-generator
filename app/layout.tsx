import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// DESIGN.md sets everything in one family (Notion's tuned Inter); headings get weight and tight tracking instead of a second face.
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Sararia Certificates: peserta isi form, sertifikat langsung jadi", template: "%s · Sararia Certificates" },
  description:
    "Peserta mengisi form, sertifikat PDF langsung jadi, terkirim ke email, dan bisa diverifikasi lewat QR. Bagian dari keluarga aplikasi Sararia.",
  applicationName: "Sararia Certificates",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before first paint so a saved or system dark preference never flashes light. "theme" is "light", "dark" or absent (follow the system).
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
