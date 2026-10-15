import { type NextRequest } from "next/server";
import { renderForTemplate, verifyUrl } from "@/lib/certificates/issue";
import { getFormFields, getOwnedEvent } from "@/lib/events";
import { formatEventDate } from "@/lib/i18n";
import { formatCertificateNumber } from "@/lib/pdf/layout";

/** Preview PDF with sample data, rendered by the exact code path used for real certificates. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/dasbor/acara/[id]/pratinjau">) {
  const { id } = await ctx.params;
  const { event, template } = await getOwnedEvent(id);
  const custom = await getFormFields(id);
  const number = formatCertificateNumber(event.numberPrefix, Number(event.date.slice(0, 4)), 1);
  const long = req.nextUrl.searchParams.get("panjang") === "1";
  const values: Record<string, string> = {
    ...Object.fromEntries(custom.map((f) => [f.key, f.type === "select" ? (f.options[0] ?? f.label) : f.label])),
    nama: long ? "Raden Ajeng Siti Nurhaliza Kusumawardhani Prawiranegara binti Abdullah" : "Siti Rahmawati",
    acara: event.title,
    tanggal: formatEventDate(event.date),
    nomor: number,
    penyelenggara: event.organizerLabel,
  };
  const pdf = await renderForTemplate(template, `Pratinjau ${event.title}`, values, verifyUrl(number));
  return new Response(pdf as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="pratinjau-${event.slug}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
