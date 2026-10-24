import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The PDF renderer reads the certificate fonts from disk; make sure they are traced
  // into the serverless bundles that render PDFs.
  outputFileTracingIncludes: {
    "/api/**/*": ["./public/fonts/**/*", "./drizzle/**/*"],
    "/forms/**/*": ["./public/fonts/**/*", "./drizzle/**/*"],
  },
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/dasbor", destination: "/forms", permanent: true },
      { source: "/dasbor/formulir/:path*", destination: "/forms/:path*", permanent: true },
      { source: "/formulir", destination: "/forms", permanent: true },
      { source: "/formulir/:id/respons", destination: "/forms/:id/responses", permanent: true },
      { source: "/formulir/:id/sertifikat", destination: "/forms/:id/certificate", permanent: true },
      { source: "/formulir/:id/setelan", destination: "/forms/:id/settings", permanent: true },
      { source: "/formulir/:path*", destination: "/forms/:path*", permanent: true },
      { source: "/masuk", destination: "/login", permanent: true },
      { source: "/mulai", destination: "/start", permanent: true },
      { source: "/privasi", destination: "/privacy", permanent: true },
      { source: "/syarat", destination: "/terms", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
