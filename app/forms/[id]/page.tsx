import { FormEditor } from "@/components/form-editor";
import { getFormFields, getOwnedEvent, issuedCount } from "@/lib/events";

export default async function QuestionsPage({ params }: PageProps<"/forms/[id]">) {
  const { id } = await params;
  const { event } = await getOwnedEvent(id);
  const [fields, responses] = await Promise.all([getFormFields(id), issuedCount(id)]);

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6 sm:px-6 pb-16">
      <FormEditor
        eventId={id}
        initialHeader={{ title: event.title, description: event.description, date: event.date, endDate: event.endDate ?? "", organizerLabel: event.organizerLabel }}
        initialQuestions={fields.map((f) => ({
          key: f.key,
          label: f.label,
          help: f.help,
          type: f.type,
          required: f.required,
          options: f.options,
          config: f.config,
          role: f.role,
        }))}
        responseCount={responses}
        hasAttendanceCode={!!event.attendanceCodeHash}
        settingsHref={`/forms/${id}/settings`}
      />
    </main>
  );
}
