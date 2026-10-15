import { Monitor } from "lucide-react";
import { CertFontFaces } from "@/components/editor/cert-font-faces";
import { TemplateEditor } from "@/components/editor/template-editor";
import { Notice } from "@/components/ui";
import { getFormFields, getOwnedEvent, issuedCount } from "@/lib/events";
import { formatEventDate } from "@/lib/i18n";
import { formatCertificateNumber } from "@/lib/pdf/layout";
import { getPreset } from "@/lib/pdf/presets";
import { BUILTIN_KEYS, BUILTIN_LABELS } from "@/lib/pdf/types";
import { storage } from "@/lib/storage";

export default async function TemplatePage({ params }: PageProps<"/dasbor/acara/[id]/template">) {
  const { id } = await params;
  const { event, template } = await getOwnedEvent(id);
  const [custom, issued] = await Promise.all([getFormFields(id), issuedCount(id)]);
  const preset = getPreset(template.preset);
  const backgroundUrl = template.backgroundKey ? await storage().signedGetUrl(template.backgroundKey, 3600) : null;

  const available = [
    ...BUILTIN_KEYS.map((key) => ({ key, label: BUILTIN_LABELS[key] })),
    ...custom.map((f) => ({ key: f.key, label: f.label })),
  ];
  const sample: Record<string, string> = {
    nama: "Siti Rahmawati",
    acara: event.title,
    tanggal: formatEventDate(event.date),
    nomor: formatCertificateNumber(event.numberPrefix, Number(event.date.slice(0, 4)), 1),
    penyelenggara: event.organizerLabel,
    ...Object.fromEntries(custom.map((f) => [f.key, f.type === "select" ? (f.options[0] ?? f.label) : f.label])),
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <CertFontFaces />
      <Notice className="mb-6 lg:hidden">
        <Monitor />
        <span>Editor template dirancang untuk layar lebar (minimal 1024 px). Buka dari laptop atau komputer untuk mengatur kolom dengan nyaman.</span>
      </Notice>
      <TemplateEditor
        eventId={id}
        widthPt={template.widthPt}
        heightPt={template.heightPt}
        backgroundUrl={backgroundUrl}
        preset={preset && !template.backgroundKey ? { id: preset.id, shapes: preset.shapes } : null}
        initialFields={template.fields}
        available={available}
        sample={sample}
        locked={issued > 0}
      />
    </main>
  );
}
