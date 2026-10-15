import "server-only";

const DEV_SECRET = "piagam-dev-secret-change-me-in-production-0000";

export const env = {
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  get authSecret() {
    const s = process.env.AUTH_SECRET;
    if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required");
    return s ?? DEV_SECRET;
  },
  google:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
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
        from: process.env.MAIL_FROM ?? "Piagam <sertifikat@piagam.caanglabs.com>",
      }
    : null,
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY ?? null,
  /** Dev login (no Google) is allowed only outside production when Google is not configured. */
  devLogin:
    process.env.NODE_ENV !== "production" &&
    !(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  /** Resend free tier (checked 2026-10): 100 emails/day, 3,000/month. */
  emailDailyLimit: Number(process.env.EMAIL_DAILY_LIMIT ?? 100),
};
