import { after, NextResponse } from "next/server";
import { z } from "zod";
import { emailCertificate, issuePdf } from "@/lib/certificates/issue";
import { downloadLinks } from "@/lib/certificates/links";
import { submitForm } from "@/lib/certificates/submit";
import { db } from "@/lib/db";
import { clientIp, clientIpHash } from "@/lib/request";
import { verifyTurnstile } from "@/lib/security/turnstile";

export const maxDuration = 30;

const bodySchema = z.object({
  name: z.string().max(200),
  email: z.string().max(300),
  answers: z.record(z.string(), z.union([z.string().max(2000), z.array(z.string().max(200)).max(50)])).default({}),
  attendanceCode: z.string().max(64).optional(),
  turnstileToken: z.string().max(4096).nullable().optional(),
});

export async function POST(req: Request, ctx: RouteContext<"/api/f/[slug]/submit">) {
  const { slug } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, code: "invalid", message: "Permintaan tidak valid." }, { status: 400 });
  const body = parsed.data;

  if (!(await verifyTurnstile(body.turnstileToken ?? null, await clientIp()))) {
    return NextResponse.json(
      { ok: false, code: "turnstile", message: "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi." },
      { status: 400 },
    );
  }

  const database = await db();
  const result = await submitForm(database, {
    slug,
    name: body.name,
    email: body.email,
    answers: body.answers,
    attendanceCode: body.attendanceCode,
    ipHash: await clientIpHash(),
  });
  if (!result.ok) {
    const status = { not_found: 404, rate_limited: 429, code_locked: 429 }[result.code as string] ?? 400;
    return NextResponse.json(result, { status });
  }

  const ready = await issuePdf(database, result.certificateId);
  if (ready) after(() => emailCertificate(database, result.certificateId));
  return NextResponse.json({ ok: true, number: result.number, pending: !ready, ...downloadLinks(result.number) });
}
