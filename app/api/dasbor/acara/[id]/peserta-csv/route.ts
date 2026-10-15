import { getFormFields, getOwnedEvent } from "@/lib/events";
import { allParticipants } from "@/lib/participants";

/** CSV cell: quoted, and prefixed with ' when it could be read as a spreadsheet formula. */
function cell(v: string) {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(_: Request, ctx: RouteContext<"/api/dasbor/acara/[id]/peserta-csv">) {
  const { id } = await ctx.params;
  const { event } = await getOwnedEvent(id);
  const [fields, rows] = await Promise.all([getFormFields(id), allParticipants(id)]);

  const header = ["Nomor", "Nama", "Email", ...fields.map((f) => f.label), "Status", "Status email", "Waktu (UTC)"];
  const lines = [header.map(cell).join(",")];
  for (const { sub, cert } of rows) {
    lines.push(
      [
        cert.number,
        sub.name,
        sub.email,
        ...fields.map((f) => sub.answers[f.key] ?? ""),
        cert.status === "revoked" ? "dicabut" : cert.pdfKey ? "valid" : "pdf tertunda",
        cert.emailStatus,
        sub.createdAt.toISOString(),
      ]
        .map(cell)
        .join(","),
    );
  }
  // BOM so Excel opens UTF-8 names correctly.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="peserta-${event.slug}.csv"`,
      "cache-control": "no-store",
    },
  });
}
