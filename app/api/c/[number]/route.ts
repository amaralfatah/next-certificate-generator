import { NextResponse, type NextRequest } from "next/server";
import { pdfFileName } from "@/lib/certificates/issue";
import { findCertificate } from "@/lib/certificates/lookup";
import { env } from "@/lib/env";
import { verifyToken } from "@/lib/security/crypto";
import { storage } from "@/lib/storage";

/** Download gate: checks the signed token and the revocation status, then hands out a 5-minute storage URL. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/c/[number]">) {
  const { number } = await ctx.params;
  if (!verifyToken(env.authSecret, "download", number, req.nextUrl.searchParams.get("t"))) {
    return new NextResponse("Link unduhan tidak valid atau sudah kedaluwarsa. Gunakan lampiran email atau minta penyelenggara mengirim ulang.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const cert = await findCertificate(number);
  if (!cert || !cert.pdfKey) return new NextResponse("Sertifikat tidak ditemukan.", { status: 404 });
  if (cert.status === "revoked") return new NextResponse("Sertifikat ini telah dicabut.", { status: 410 });
  const url = await storage().signedGetUrl(cert.pdfKey, 300, pdfFileName(cert.number));
  return NextResponse.redirect(new URL(url, req.url), 302);
}
