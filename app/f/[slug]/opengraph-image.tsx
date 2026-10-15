import { eq } from "drizzle-orm";
import { db, events } from "@/lib/db";
import { formatEventDate } from "@/lib/i18n";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "Ambil sertifikat acara";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Link preview for the participant form, e.g. when shared in a WhatsApp group. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event] = await (await db()).select().from(events).where(eq(events.slug, slug));
  if (!event || event.status === "draft") {
    return ogCard({ eyebrow: "Piagam", title: "Sertifikat otomatis", footer: "piagam" });
  }
  return ogCard({
    eyebrow: `Sertifikat · ${event.organizerLabel}`.slice(0, 60),
    title: event.title,
    footer: `${formatEventDate(event.date)} · isi form, unduh sertifikatmu`,
  });
}
