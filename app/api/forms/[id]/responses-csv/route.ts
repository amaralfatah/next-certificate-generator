import { getFormFields, getOwnedEvent } from "@/lib/events";
import { answerText } from "@/lib/forms";
import { allParticipants } from "@/lib/participants";

/** CSV cell: quoted, and prefixed with ' when it could be read as a spreadsheet formula. */
function cell(v: string) {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(_: Request, ctx: RouteContext<"/api/forms/[id]/responses-csv">) {
  const { id } = await ctx.params;
  const { event } = await getOwnedEvent(id);
  const [fields, rows] = await Promise.all([getFormFields(id), allParticipants(id)]);

  const name = fields.find((f) => f.role === "name")?.label ?? "Nama";
  const email = fields.find((f) => f.role === "email")?.label ?? "Email";
  const custom = fields.filter((f) => !f.role);
  const header = ["Waktu (UTC)", name, email, ...custom.map((f) => f.label), "Nomor sertifikat", "Status sertifikat", "Status email"];
  const lines = [header.map(cell).join(",")];
  for (const { sub, cert } of rows) {
    lines.push(
      [
        sub.createdAt.toISOString(),
        sub.name,
        sub.email,
        ...custom.map((f) => answerText(sub.answers[f.key])),
        cert.number,
        cert.status === "revoked" ? "dicabut" : cert.pdfKey ? "valid" : "pdf tertunda",
        cert.emailStatus,
      ]
        .map(cell)
        .join(","),
    );
  }
  // BOM so Excel opens UTF-8 names correctly.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="responses-${event.slug}.csv"`,
      "cache-control": "no-store",
    },
  });
}
