import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { createEvent } from "@/app/dasbor/actions";
import { EventDetailsForm } from "@/components/event-details-form";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Acara baru" };

export default function NewEventPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/dasbor" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Dasbor
      </Link>
      <p className="eyebrow mt-6">Langkah 1 dari 4</p>
      <h1 className="mt-2 text-4xl font-semibold">Acara baru</h1>
      <p className="mt-2 text-ink-2">Isi detail acara. Setelah ini kamu akan mengunggah desain sertifikat.</p>
      <Card className="mt-8 p-5 sm:p-7">
        <EventDetailsForm action={createEvent} submitLabel="Lanjut ke template" />
      </Card>
    </main>
  );
}
