import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EventTabs } from "@/components/event-tabs";
import { AvailabilityBadge } from "@/components/status-badge";
import { getOwnedEvent, issuedCount } from "@/lib/events";
import { formAvailability } from "@/lib/forms";
import { formatEventDate } from "@/lib/i18n";

export async function generateMetadata({ params }: LayoutProps<"/dasbor/acara/[id]">): Promise<Metadata> {
  const { event } = await getOwnedEvent((await params).id);
  return { title: event.title };
}

export default async function EventLayout({ children, params }: LayoutProps<"/dasbor/acara/[id]">) {
  const { id } = await params;
  const { event } = await getOwnedEvent(id);
  const issued = await issuedCount(id);

  return (
    <>
      <div className="border-b border-line bg-card/50">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <Link href="/dasbor" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> Semua acara
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold sm:text-[2.1rem]">{event.title}</h1>
            <AvailabilityBadge value={formAvailability(event, issued)} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {event.organizerLabel} · {formatEventDate(event.date)}
          </p>
          <div className="mt-4">
            <EventTabs base={`/dasbor/acara/${id}`} />
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
