import "server-only";
import { env } from "@/lib/env";
import { signToken } from "@/lib/security/crypto";
import { verifyUrl } from "./issue";

/** Short-lived participant links returned right after submitting (valid 1 hour). */
export function downloadLinks(number: string) {
  const n = encodeURIComponent(number);
  return {
    downloadUrl: `/api/c/${n}?t=${signToken(env.authSecret, "download", number, 3600)}`,
    retryUrl: `/api/c/${n}/retry?t=${signToken(env.authSecret, "retry", number, 3600)}`,
    verifyUrl: verifyUrl(number),
  };
}
