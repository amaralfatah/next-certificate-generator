import { type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { verifyToken } from "@/lib/security/crypto";
import { storage } from "@/lib/storage";

/**
 * Local-storage stand-in for R2 signed URLs (used only when R2 is not configured).
 * GET serves a file, PUT accepts an upload; both require an HMAC token for that key.
 */
function authorized(req: NextRequest, method: "GET" | "PUT") {
  if (env.r2) return null;
  const key = req.nextUrl.searchParams.get("key");
  if (!key || !verifyToken(env.authSecret, `file-${method}`, key, req.nextUrl.searchParams.get("t"))) return null;
  return key;
}

const TYPES: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg" };

export async function GET(req: NextRequest) {
  const key = authorized(req, "GET");
  if (!key) return new Response("Forbidden", { status: 403 });
  const bytes = await storage().get(key);
  if (!bytes) return new Response("Not found", { status: 404 });
  const name = req.nextUrl.searchParams.get("name");
  const headers: Record<string, string> = {
    "content-type": TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream",
    "cache-control": "private, max-age=300",
  };
  if (name) headers["content-disposition"] = `attachment; filename="${name.replace(/[^\w.-]/g, "_")}"`;
  return new Response(bytes as BodyInit, { headers });
}

export async function PUT(req: NextRequest) {
  const key = authorized(req, "PUT");
  if (!key) return new Response("Forbidden", { status: 403 });
  const body = new Uint8Array(await req.arrayBuffer());
  if (body.byteLength > 5 * 1024 * 1024) return new Response("Too large", { status: 413 });
  await storage().put(key, body, req.headers.get("content-type") ?? "application/octet-stream");
  return new Response(null, { status: 204 });
}
