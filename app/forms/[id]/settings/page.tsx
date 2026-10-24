import { DeleteEventForm, DuplicateButton } from "@/components/settings-forms";
import { SettingsPanel } from "@/components/settings-panel";
import { getOwnedEvent, issuedCount } from "@/lib/events";
import { toLocalInput } from "@/lib/i18n";

export default async function SettingsPage({ params }: PageProps<"/forms/[id]/settings">) {
  const { id } = await params;
  const { event } = await getOwnedEvent(id);
  const responses = await issuedCount(id);

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6 sm:px-6">
      <h2 className="sr-only">Setelan</h2>
      <SettingsPanel
        eventId={id}
        initial={{
          opensAt: toLocalInput(event.opensAt),
          closesAt: toLocalInput(event.closesAt),
          quota: event.quota ? String(event.quota) : "",
          hasCode: !!event.attendanceCodeHash,
          numberPrefix: event.numberPrefix,
          prefixLocked: responses > 0,
        }}
      />

      <section className="rounded-xl border border-line bg-card p-5 sm:p-6" aria-labelledby="set-formulir">
        <h3 id="set-formulir" className="mb-5 text-lg font-semibold">
          Formulir
        </h3>
        <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <h4 className="font-medium">Duplikat formulir</h4>
            <p className="mt-0.5 text-sm text-muted">Salin pertanyaan, desain sertifikat, dan setelan ke draf baru tanpa respons.</p>
          </div>
          <div className="shrink-0">
            <DuplicateButton eventId={id} />
          </div>
        </div>
        <div className="pt-5">
          <h4 className="font-medium text-danger">Hapus formulir</h4>
          <p className="mt-0.5 mb-4 text-sm text-muted">
            Semua respons, desain, dan file sertifikat ikut terhapus, dan link verifikasinya berhenti bekerja. Tidak bisa dibatalkan.
          </p>
          <DeleteEventForm eventId={id} title={event.title} />
        </div>
      </section>
    </main>
  );
}
