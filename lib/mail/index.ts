import "server-only";
import { env } from "@/lib/env";

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Uint8Array }[];
};

/** Sends through Resend. Without RESEND_API_KEY the mail is logged and reported as skipped. */
export async function sendMail(mail: Mail): Promise<"sent" | "skipped"> {
  if (!env.resend) {
    console.info(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return "skipped";
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.resend.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.resend.from,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
      })),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return "sent";
}

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ENTITIES[c]);

export function certificateMail(p: {
  name: string;
  eventTitle: string;
  organizer: string;
  number: string;
  verifyUrl: string;
}) {
  const subject = `Sertifikat ${p.eventTitle}`;
  const text = [
    `Halo ${p.name},`,
    "",
    `Terima kasih telah mengikuti ${p.eventTitle} yang diselenggarakan ${p.organizer}.`,
    `Sertifikat Anda terlampir dalam email ini (nomor ${p.number}).`,
    "",
    `Keaslian sertifikat dapat dicek di: ${p.verifyUrl}`,
    "",
    "Piagam",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4efe4;font-family:Georgia,serif;color:#1c2a3a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fffdf7;border:1px solid #e3d8c3;border-radius:12px">
<tr><td style="padding:32px">
<p style="margin:0 0 4px;font:600 11px/1.4 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#a8321f">Sertifikat</p>
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;font-weight:600">${esc(p.eventTitle)}</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6">Halo ${esc(p.name)},</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6">Terima kasih telah mengikuti acara yang diselenggarakan <b>${esc(p.organizer)}</b>. Sertifikat Anda terlampir dalam email ini.</p>
<p style="margin:20px 0;font:13px/1.5 'Courier New',monospace;background:#f4efe4;border-radius:8px;padding:10px 12px">No. ${esc(p.number)}</p>
<p style="margin:0"><a href="${esc(p.verifyUrl)}" style="display:inline-block;background:#1c2a3a;color:#fffdf7;text-decoration:none;font:600 14px Arial,sans-serif;padding:10px 16px;border-radius:8px">Cek keaslian sertifikat</a></p>
</td></tr></table>
<p style="font:12px Arial,sans-serif;color:#7a7266;margin:16px 0 0">Dikirim oleh Piagam atas nama ${esc(p.organizer)}.</p>
</td></tr></table></body></html>`;
  return { subject, text, html };
}
