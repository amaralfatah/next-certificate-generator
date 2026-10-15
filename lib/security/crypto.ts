import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hmac(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** One-way hash for IPs (rate limiting only, never shown). */
export function hashIp(secret: string, ip: string) {
  return createHash("sha256").update(`${secret}:${ip}`).digest("base64url").slice(0, 32);
}

const normalizeCode = (c: string) => c.trim().toUpperCase();

/** Attendance codes are short; scrypt keeps a leaked hash from being trivially reversed. */
export function hashCode(code: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(normalizeCode(code), salt, 32).toString("base64url");
  return `${salt}:${hash}`;
}

export function verifyCode(code: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return safeEqual(scryptSync(normalizeCode(code), salt, 32).toString("base64url"), hash);
}

/** Signed, expiring token `<exp>.<sig>` over `purpose:subject:exp`. */
export function signToken(secret: string, purpose: string, subject: string, ttlSeconds: number) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${exp}.${hmac(secret, `${purpose}:${subject}:${exp}`)}`;
}

export function verifyToken(secret: string, purpose: string, subject: string, token: string | null) {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now() / 1000) return false;
  return safeEqual(sig, hmac(secret, `${purpose}:${subject}:${exp}`));
}
