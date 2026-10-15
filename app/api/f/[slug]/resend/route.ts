import { and, eq, sql } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { emailCertificate } from "@/lib/certificates/issue";
import { certificates, db, events, submissions } from "@/lib/db";
import { clientIp, clientIpHash } from "@/lib/request";
import { hit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

const bodySchema = z.object({ email: z.string().max(300), turnstileToken: z.string().max(4096).nullable().optional() });

/**
 * "Send my certificate again" for an email that already submitted. It always answers the
 * same way, so it can't be used to probe who attended; the mail goes only to the stored address.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/f/[slug]/resend">) {
  const { slug } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Permintaan tidak valid." }, { status: 400 });
  if (!(await verifyTurnstile(parsed.data.turnstileToken ?? null, await clientIp()))) {
    return NextResponse.json({ ok: false, message: "Verifikasi keamanan gagal. Muat ulang halaman." }, { status: 400 });
  }

  const database = await db();
  const email = parsed.data.email.trim().toLowerCase();
  const ipHash = await clientIpHash();
  const allowed =
    (!ipHash || (await hit(database, `resend-ip:${ipHash}`, 5, 600))) &&
    (await hit(database, `resend:${slug}:${email}`, 2, 3600));
  if (!allowed) {
    return NextResponse.json({ ok: false, message: "Terlalu sering. Coba lagi nanti." }, { status: 429 });
  }

  const [row] = await database
    .select({ id: certificates.id })
    .from(certificates)
    .innerJoin(submissions, eq(submissions.id, certificates.submissionId))
    .innerJoin(events, eq(events.id, submissions.eventId))
    .where(and(eq(events.slug, slug), sql`lower(${submissions.email}) = ${email}`, eq(certificates.status, "valid")));
  if (row) after(() => emailCertificate(database, row.id));

  return NextResponse.json({
    ok: true,
    message: "Jika email ini terdaftar, salinan sertifikat sedang dikirim. Periksa juga folder spam.",
  });
}
