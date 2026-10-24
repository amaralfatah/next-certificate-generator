import { type NextRequest } from "next/server";
import { renderForTemplate, verifyUrl } from "@/lib/certificates/issue";
import { getFormFields, getOwnedEvent } from "@/lib/events";
import { sampleAnswer } from "@/lib/forms";
import { formatEventDate } from "@/lib/i18n";
import { sampleName } from "@/lib/new-form";
import { formatCertificateNumber } from "@/lib/pdf/layout";

/** Preview PDF with sample data, rendered by the exact code path used for real certificates. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/forms/[id]/preview">) {
  const { id } = await ctx.params;
  const { event, template } = await getOwnedEvent(id);
  const custom = await getFormFields(id);
  const number = formatCertificateNumber(event.numberPrefix, Number(event.date.slice(0, 4)), 1);
  const long = req.nextUrl.searchParams.get("long") === "1";
  const values: Record<string, string> = {
    ...Object.fromEntries(custom.filter((f) => !f.role).map((f) => [f.key, sampleAnswer(f)])),
    nama: long ? "Raden Ajeng Siti Nurhaliza Kusumawardhani Prawiranegara binti Abdullah" : await sampleName(),
    acara: event.title,
    tanggal: formatEventDate(event.date, event.endDate),
    nomor: number,
    penyelenggara: event.organizerLabel,
  };
  const pdf = await renderForTemplate(template, `Pratinjau ${event.title}`, values, verifyUrl(number));
  return new Response(pdf as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="preview-${event.slug}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
