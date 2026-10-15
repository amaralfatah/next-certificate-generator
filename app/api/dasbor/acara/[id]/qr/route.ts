import QRCode from "qrcode";
import { type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getOwnedEvent } from "@/lib/events";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/dasbor/acara/[id]/qr">) {
  const { id } = await ctx.params;
  const { event } = await getOwnedEvent(id);
  const png = await QRCode.toBuffer(`${env.appUrl}/f/${event.slug}`, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#1c2a3a", light: "#ffffff" },
  });
  const headers: Record<string, string> = { "content-type": "image/png", "cache-control": "private, max-age=300" };
  if (req.nextUrl.searchParams.get("download")) headers["content-disposition"] = `attachment; filename="qr-${event.slug}.png"`;
  return new Response(new Uint8Array(png), { headers });
}
