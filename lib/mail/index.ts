import "server-only";
import { env } from "@/lib/env";

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Uint8Array }[];
};

/** Sends through SMTP, else Resend. With neither configured the mail is logged and reported as skipped. */
export async function sendMail(mail: Mail): Promise<"sent" | "skipped"> {
  if (env.smtp) {
    const { createTransport } = await import("nodemailer");
    const transport = createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.password },
    });
    await transport.sendMail({
      from: env.smtp.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content) })),
    });
    return "sent";
  }
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
    "Sararia Certificates",
  ].join("\n");
  // Follows DESIGN.md: warm paper canvas, white card on a hairline, one blue pill CTA. Inline styles only (mail clients).
  const font = "Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;background:#f6f5f4;font-family:${font};color:#000000">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f4"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e6e6e6;border-radius:12px">
<tr><td style="padding:32px 28px">
<h1 style="margin:0 0 20px;font:700 26px/1.23 ${font};letter-spacing:-.625px;color:#000000">${esc(p.eventTitle)}</h1>
<p style="margin:0 0 12px;font:400 16px/1.5 ${font};color:#31302e">Halo ${esc(p.name)},</p>
<p style="margin:0 0 24px;font:400 16px/1.5 ${font};color:#31302e">Terima kasih telah mengikuti acara yang diselenggarakan <b style="font-weight:600;color:#000000">${esc(p.organizer)}</b>. Sertifikat Anda terlampir dalam email ini.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f6f5f4;border:1px solid #e6e6e6;border-radius:8px"><tr><td style="padding:12px 16px">
<p style="margin:0 0 2px;font:600 12px/1.33 ${font};letter-spacing:.125px;color:#615d59">Nomor sertifikat</p>
<p style="margin:0;font:500 15px/1.33 'SF Mono',Menlo,Consolas,'Courier New',monospace;color:#000000">${esc(p.number)}</p>
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#0075de;border-radius:9999px">
<a href="${esc(p.verifyUrl)}" style="display:inline-block;padding:10px 20px;font:500 16px/1.5 ${font};color:#ffffff;text-decoration:none">Cek keaslian sertifikat</a>
</td></tr></table>
</td></tr></table>
<p style="max-width:520px;margin:20px 0 0;font:400 14px/1.43 ${font};color:#615d59">Dikirim oleh Sararia Certificates atas nama ${esc(p.organizer)}.</p>
</td></tr></table></body></html>`;
  return { subject, text, html };
}
