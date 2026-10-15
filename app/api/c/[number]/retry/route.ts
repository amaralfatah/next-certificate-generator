import { after, NextResponse, type NextRequest } from "next/server";
import { downloadLinks } from "@/lib/certificates/links";
import { emailCertificate, issuePdf } from "@/lib/certificates/issue";
import { findCertificate } from "@/lib/certificates/lookup";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyToken } from "@/lib/security/crypto";

export const maxDuration = 30;

/** Participant-side "try again" when the PDF could not be rendered right after submitting. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/c/[number]/retry">) {
  const { number } = await ctx.params;
  if (!verifyToken(env.authSecret, "retry", number, req.nextUrl.searchParams.get("t"))) {
    return NextResponse.json({ ok: false, message: "Sesi kedaluwarsa. Hubungi penyelenggara." }, { status: 403 });
  }
  const cert = await findCertificate(number);
  if (!cert || cert.status === "revoked") return NextResponse.json({ ok: false, message: "Sertifikat tidak tersedia." }, { status: 404 });
  const database = await db();
  const ready = await issuePdf(database, cert.id);
  if (!ready) return NextResponse.json({ ok: false, message: "Sertifikat masih gagal dibuat. Coba lagi sebentar lagi." }, { status: 503 });
  if (cert.emailStatus !== "sent") after(() => emailCertificate(database, cert.id));
  return NextResponse.json({ ok: true, ...downloadLinks(number) });
}
