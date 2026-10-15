import { updateEventDetails } from "@/app/dasbor/actions";
import { EventDetailsForm } from "@/components/event-details-form";
import { DeleteEventForm, DuplicateButton, GuardsForm } from "@/components/settings-forms";
import { Card } from "@/components/ui";
import { getOwnedEvent, issuedCount } from "@/lib/events";
import { toLocalInput } from "@/lib/i18n";

export default async function SettingsPage({ params }: PageProps<"/dasbor/acara/[id]/pengaturan">) {
  const { id } = await params;
  const { event } = await getOwnedEvent(id);
  const issued = await issuedCount(id);

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8 sm:px-6">
      <Card className="p-5 sm:p-7">
        <h2 className="text-2xl font-semibold">Detail acara</h2>
        <div className="mt-5">
          <EventDetailsForm
            action={updateEventDetails.bind(null, id)}
            submitLabel="Simpan detail"
            prefixLocked={issued > 0}
            initial={{
              title: event.title,
              date: event.date,
              organizerLabel: event.organizerLabel,
              description: event.description,
              numberPrefix: event.numberPrefix,
            }}
          />
        </div>
      </Card>

      <Card className="p-5 sm:p-7" id="pengaman">
        <h2 className="text-2xl font-semibold">Pengaman</h2>
        <p className="mt-1 mb-5 text-sm text-ink-2">
          Turnstile dan batas percobaan per IP selalu aktif. Kode salah 5 kali dalam 10 menit memblokir sementara.
        </p>
        <GuardsForm
          eventId={id}
          initial={{
            opensAt: toLocalInput(event.opensAt),
            closesAt: toLocalInput(event.closesAt),
            quota: event.quota ? String(event.quota) : "",
            hasCode: !!event.attendanceCodeHash,
          }}
        />
      </Card>

      <Card className="p-5 sm:p-7">
        <h2 className="text-2xl font-semibold">Duplikat</h2>
        <p className="mt-1 mb-5 text-sm text-ink-2">
          Salin detail, template, form, dan pengaman ke acara draf baru tanpa peserta. Cocok untuk acara berseri atau mengganti
          template yang sudah terkunci.
        </p>
        <DuplicateButton eventId={id} />
      </Card>

      <Card className="border-seal/30 p-5 sm:p-7">
        <h2 className="text-2xl font-semibold text-seal-ink">Hapus acara</h2>
        <p className="mt-1 mb-5 text-sm text-ink-2">
          Menghapus acara beserta seluruh data peserta, template, dan file sertifikat. Halaman verifikasi sertifikat acara ini
          tidak akan bisa diakses lagi. Tindakan ini tidak bisa dibatalkan.
        </p>
        <DeleteEventForm eventId={id} title={event.title} />
      </Card>
    </main>
  );
}
