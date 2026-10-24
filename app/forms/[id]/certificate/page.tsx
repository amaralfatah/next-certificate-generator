import { Monitor } from "lucide-react";
import { CertFontFaces } from "@/components/editor/cert-font-faces";
import { TemplateEditor } from "@/components/editor/template-editor";
import { Notice } from "@/components/ui";
import { getFormFields, getOwnedEvent, issuedCount } from "@/lib/events";
import { PRINTABLE_TYPES, sampleAnswer } from "@/lib/forms";
import { formatEventDate } from "@/lib/i18n";
import { sampleName } from "@/lib/new-form";
import { formatCertificateNumber } from "@/lib/pdf/layout";
import { getPreset } from "@/lib/pdf/presets";
import { BUILTIN_KEYS, BUILTIN_LABELS } from "@/lib/pdf/types";
import { storage } from "@/lib/storage";

export default async function TemplatePage({ params }: PageProps<"/forms/[id]/certificate">) {
  const { id } = await params;
  const { event, template } = await getOwnedEvent(id);
  const [custom, issued, nama] = await Promise.all([getFormFields(id), issuedCount(id), sampleName()]);
  const preset = getPreset(template.preset);
  const backgroundUrl = template.backgroundKey ? await storage().signedGetUrl(template.backgroundKey, 3600) : null;

  const available = [
    ...BUILTIN_KEYS.map((key) => ({ key, label: key === "nama" ? (custom.find((f) => f.role === "name")?.label ?? BUILTIN_LABELS.nama) : BUILTIN_LABELS[key] })),
    ...custom.filter((f) => !f.role && PRINTABLE_TYPES.includes(f.type)).map((f) => ({ key: f.key, label: f.label })),
  ];
  const sample: Record<string, string> = {
    nama,
    acara: event.title,
    tanggal: formatEventDate(event.date, event.endDate),
    nomor: formatCertificateNumber(event.numberPrefix, Number(event.date.slice(0, 4)), 1),
    penyelenggara: event.organizerLabel,
    ...Object.fromEntries(custom.filter((f) => !f.role).map((f) => [f.key, sampleAnswer(f)])),
  };

  return (
    // A workspace, not a page to read: it fills the width and height under the top bar.
    <main className="flex flex-1 flex-col">
      <CertFontFaces />
      <Notice className="m-4 lg:hidden">
        <Monitor />
        <span>Editor sertifikat dirancang untuk layar lebar (minimal 1024 px). Buka dari laptop atau komputer untuk mengatur kolom dengan nyaman.</span>
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
