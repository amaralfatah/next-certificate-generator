import { FormBuilder } from "@/components/form-builder";
import { getFormFields, getOwnedEvent, issuedCount } from "@/lib/events";

export default async function FormPage({ params }: PageProps<"/dasbor/acara/[id]/form">) {
  const { id } = await params;
  await getOwnedEvent(id);
  const [fields, issued] = await Promise.all([getFormFields(id), issuedCount(id)]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h2 className="text-2xl font-semibold">Form peserta</h2>
      <p className="mt-1 mb-6 text-ink-2">Nama dan email selalu ada. Tambahkan kolom lain bila perlu: teks, email, pilihan, atau angka.</p>
      <FormBuilder
        eventId={id}
        locked={issued > 0}
        initial={fields.map((f) => ({ label: f.label, type: f.type, required: f.required, options: f.options }))}
      />
    </main>
  );
}
