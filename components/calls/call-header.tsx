import Link from "next/link";
import { IconChevronLeft } from "nucleo-sharp-essential";

import { CallStatusBadge } from "@/components/calls/call-badges";
import { CallSheetMenu } from "@/components/calls/call-sheet-menu";
import { JoinCallLink } from "@/components/calls/join-call-link";
import type { CallDetail } from "@/lib/calls/queries";
import { callSheetSubject, callSheetText, callWhen } from "@/lib/calls/sheet";
import { calls } from "@/lib/i18n/fr/calls";
import { cn } from "@/lib/utils";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { calls };

/**
 * Head of a call's page (proto `docs/protos/pages.html`): the way back, the
 * title with its state beside it, « projet · quand · organisé par X » under
 * it — no grey line of facts — and on the right « Rejoindre » while it is
 * to come, « ⋯ » for its sheet.
 */
export function CallHeader({
  call,
  back,
  where,
  organizer,
  upcoming,
  closed,
}: {
  call: CallDetail;
  back: { href: string; label: string };
  // The project (a link to it) or « Réunion interne ».
  where: { label: string; href: string | null };
  organizer: string | null;
  upcoming: boolean;
  closed: boolean;
}) {
  // A meeting's page has no other title; a project's call sits under the
  // project's own header.
  const Heading = call.projectId ? "h2" : "h1";
  const sheet = callSheetText(call);
  return (
    <header className="flex flex-col gap-3">
      <Link
        href={back.href}
        className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <IconChevronLeft aria-hidden className="size-4" />
        {back.label}
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Heading
              className={cn(
                "font-heading break-words",
                call.projectId ? "text-display-md" : "text-display-lg",
              )}
            >
              {call.title}
            </Heading>
            <CallStatusBadge
              status={call.status}
              upcoming={upcoming}
              closed={closed}
            />
          </div>
          <p className="text-body-md text-[color:var(--text-secondary)]">
            {where.href ? (
              <Link
                href={where.href}
                className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {where.label}
              </Link>
            ) : (
              where.label
            )}
            {" · "}
            <time dateTime={call.occurredAt}>{callWhen(call)}</time>
            {organizer && ` · ${fr.calls.page.organizedBy(organizer)}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {call.meetingUrl && upcoming && (
            <JoinCallLink url={call.meetingUrl} title={call.title} />
          )}
          <CallSheetMenu
            title={call.title}
            sheet={sheet}
            mailto={mailtoHref(
              call.guests.map((g) => g.email).join(","),
              callSheetSubject(call),
              sheet,
            )}
          />
        </div>
      </div>
    </header>
  );
}
