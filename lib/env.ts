import "server-only";

const DEV_SECRET = "piagam-dev-secret-change-me-in-production-0000";

export const env = {
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  get authSecret() {
    const s = process.env.AUTH_SECRET;
    if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required");
    return s ?? DEV_SECRET;
  },
  /** Neon Auth (Managed Better Auth) with Google sign-in. */
  neonAuth: Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET),
  /** Neon Object Storage (S3 API, path-style). Takes priority over R2. */
  s3:
    process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          endpoint: process.env.AWS_ENDPOINT_URL_S3.replace(/\/$/, ""),
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION ?? "us-east-1",
          bucket: process.env.S3_BUCKET ?? "sararia-certificates-bucket",
        }
      : null,
  r2:
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
      ? {
          accountId: process.env.R2_ACCOUNT_ID,
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
          bucket: process.env.R2_BUCKET,
        }
      : null,
  resend: process.env.RESEND_API_KEY
    ? {
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.MAIL_FROM ?? "Sararia Certificates <sertifikat@certificates.sararia.com>",
      }
    : null,
  /** SMTP (Gmail with an App Password by default). Takes priority over Resend. */
  smtp:
    process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? {
          host: process.env.SMTP_HOST ?? "smtp.gmail.com",
          port: Number(process.env.SMTP_PORT ?? 465),
          user: process.env.SMTP_USER,
          password: process.env.SMTP_PASSWORD.replace(/\s+/g, ""),
          from: process.env.MAIL_FROM ?? `Sararia Certificates <${process.env.SMTP_USER}>`,
        }
      : null,
  /** True when any mail provider (SMTP or Resend) is configured. */
  mailEnabled: Boolean((process.env.SMTP_USER && process.env.SMTP_PASSWORD) || process.env.RESEND_API_KEY),
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY ?? null,
  /** Dev login (no Google) is allowed only outside production when Neon Auth is not configured. */
  devLogin:
    process.env.NODE_ENV !== "production" &&
    !(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET),
  /** Resend free tier (checked 2026-10): 100 emails/day, 3,000/month. */
  emailDailyLimit: Number(process.env.EMAIL_DAILY_LIMIT ?? 100),
};
