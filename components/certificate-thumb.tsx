import { ImageOff } from "lucide-react";
import { CertificateSvg } from "@/components/certificate-svg";
import type { Event, Template } from "@/lib/db/schema";
import { formatEventDate } from "@/lib/i18n";
import { formatCertificateNumber } from "@/lib/pdf/layout";
import { getPreset } from "@/lib/pdf/presets";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";

/** Small, faithful preview of an event's certificate (preset vectors or uploaded background). */
export async function CertificateThumb({
  event,
  template,
  className,
}: {
  event: Pick<Event, "title" | "date" | "endDate" | "organizerLabel" | "numberPrefix">;
  template: Template;
  className?: string;
}) {
  const preset = template.backgroundKey ? null : getPreset(template.preset);
  const bg = template.backgroundKey ? await storage().signedGetUrl(template.backgroundKey, 3600) : null;
  const values = {
    nama: "Nama Peserta",
    acara: event.title,
    tanggal: formatEventDate(event.date, event.endDate),
    penyelenggara: event.organizerLabel,
    nomor: formatCertificateNumber(event.numberPrefix, Number(event.date.slice(0, 4)), 1),
  };

  if (!preset && !bg) {
    return (
      <div className={cn("grid aspect-video place-items-center bg-paper-2 text-muted", className)}>
        <span className="flex flex-col items-center gap-1.5 text-xs font-medium">
          <ImageOff className="size-5" aria-hidden />
          Desain belum dipilih
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-white", className)} style={{ aspectRatio: `${template.widthPt} / ${template.heightPt}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {bg && <img src={bg} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
      <CertificateSvg
        width={template.widthPt}
        height={template.heightPt}
        shapes={preset?.shapes}
        fields={template.fields}
        values={values}
        className="absolute inset-0 size-full"
      />
    </div>
  );
}
