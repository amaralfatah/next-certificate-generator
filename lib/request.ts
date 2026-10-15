import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { hashIp } from "@/lib/security/crypto";

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function clientIpHash() {
  const ip = await clientIp();
  return ip ? hashIp(env.authSecret, ip) : null;
}
