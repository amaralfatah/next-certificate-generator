import type { Metadata } from "next";
import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { EventTabs } from "@/components/event-tabs";
import { Mark } from "@/components/seal";
import { ShareDialog } from "@/components/share-dialog";
import { AvailabilityBadge } from "@/components/status-badge";
import { ButtonLink } from "@/components/ui";
import { env } from "@/lib/env";
import { getOwnedEvent, issuedCount } from "@/lib/events";
import { formAvailability } from "@/lib/forms";

export async function generateMetadata({ params }: LayoutProps<"/forms/[id]">): Promise<Metadata> {
  const { event } = await getOwnedEvent((await params).id);
  return { title: event.title };
}

/** One top bar for the whole form, as in Google Forms: brand back to the list, title, actions, then the tabs. */
export default async function FormLayout({ children, params }: LayoutProps<"/forms/[id]">) {
  const { id } = await params;
  const { event, organizer } = await getOwnedEvent(id);
  const responses = await issuedCount(id);
  const base = `/forms/${id}`;
  const availability = formAvailability(event, responses);

  return (
    <div className="flex min-h-dvh flex-col [--bar-h:6.25rem]">
      <header className="sticky top-0 z-30 border-b border-line bg-card">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <Link href="/forms" className="group relative grid size-9 shrink-0 place-items-center rounded-md hover:bg-paper-2 focus-visible:bg-paper-2" aria-label="Semua formulir" title="Semua formulir">
            <Mark className="size-7 transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0" />
            <ArrowLeft className="absolute size-5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
          </Link>
          <h1 className="min-w-0 truncate text-[1.0625rem] font-semibold">{event.title}</h1>
          <span className="hidden shrink-0 sm:inline-flex">
            <AvailabilityBadge value={availability} />
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <ButtonLink href={`/f/${event.slug}?preview=1`} target="_blank" variant="ghost" aria-label="Pratinjau" title="Pratinjau">
              <Eye />
            </ButtonLink>
            <ShareDialog eventId={id} status={event.status} formUrl={`${env.appUrl}/f/${event.slug}`} formPath={`/f/${event.slug}`} />
            <ThemeToggle />
            <AccountMenu name={organizer.name} email={organizer.email} />
          </div>
        </div>
        <div className="px-4 pb-1 sm:hidden">
          <AvailabilityBadge value={availability} />
        </div>
        <div className="flex justify-center px-3">
          <EventTabs base={base} responses={responses} />
        </div>
      </header>
      {children}
    </div>
  );
}
