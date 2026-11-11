import { IconChevronLeft } from "nucleo-sharp-essential";

import { callState, CallStatusBadge } from "@/components/calls/call-badges";
import { CallProjectPill } from "@/components/calls/call-project-pill";
import { CallSheetMenu } from "@/components/calls/call-sheet-menu";
import { JoinCallLink } from "@/components/calls/join-call-link";
import { ProjectHeader } from "@/components/projects/project-header";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { callsHref, type CallDoor } from "@/lib/calls/door";
import type { CallDetail } from "@/lib/calls/queries";
import { callWhen } from "@/lib/calls/sheet";
import { calls } from "@/lib/i18n/fr/calls";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { calls, shell };

/**
 * Head of a call's page (proto `docs/protos/pages.html`), drawn by the door
 * it was opened from:
 * - from Calls (`/app/calls/<id>`): « ‹ Tous les calls », the title with its
 *   state beside it, « Projet : X › · quand · organisé par Y » under it (the
 *   project in its hue, a link to it; « Réunion interne » otherwise);
 * - from its project: the project's module header — trail « Calls / title »
 *   in the top bar, the title as the h1 with its state, when and who
 *   organizes as its facts.
 * On the right, « Rejoindre » while it is to come and « ⋯ » (CallSheetMenu).
 */
export function CallHeader({
  call,
  project,
  deal = null,
  door,
  organizer,
  upcoming,
  closed,
  deletable,
}: {
  call: CallDetail;
  project: { id: string; title: string } | null;
  // A deal's call (BIZ 6): « Deal · Nadia › » leads to the deal.
  deal?: { id: string; artistName: string | null } | null;
  door: CallDoor;
  organizer: string | null;
  upcoming: boolean;
  closed: boolean;
  // « Supprimer la réunion » in its « ⋯ » (lib/calls/delete-rule.ts).
  deletable: boolean;
}) {
  const back = callsHref(door);
  const actions = (
    <div className="flex shrink-0 items-center gap-2">
      {call.meetingUrl && upcoming && (
        <JoinCallLink url={call.meetingUrl} title={call.title} />
      )}
      <CallSheetMenu
        call={{
          id: call.id,
          title: call.title,
          occurredAt: call.occurredAt,
          endsAt: call.endsAt,
          agenda: call.agenda,
          durationMinutes: call.durationMinutes,
          meetingUrl: call.meetingUrl,
          guestEmails: call.guests.map((g) => g.email),
        }}
        deletable={deletable}
        afterDeleteHref={back}
      />
    </div>
  );

  if (door.kind === "project")
    return (
      <ProjectHeader
        projectId={door.projectId}
        crumbs={[
          { label: fr.shell.project.sidebar.calls, href: back },
          { label: call.title },
        ]}
        title={call.title}
        status={callState(call.status, { upcoming, closed })}
        actions={actions}
        facts={[
          { key: "when", value: callWhen(call) },
          ...(organizer
            ? [
                {
                  key: "organizer",
                  label: fr.calls.page.organizer,
                  value: organizer,
                },
              ]
            : []),
        ]}
      />
    );

  return (
    <header className="flex flex-col gap-3">
      <ViewLink
        href={back}
        className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <IconChevronLeft aria-hidden className="size-4" />
        {fr.calls.back}
      </ViewLink>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-heading text-display-lg break-words">
              {call.title}
            </h1>
            <CallStatusBadge
              status={call.status}
              upcoming={upcoming}
              closed={closed}
            />
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md text-[color:var(--text-secondary)]">
            <CallProjectPill
              projectId={project?.id ?? null}
              title={project?.title ?? null}
              deal={deal}
              href={
                deal
                  ? routes.deal(deal.id)
                  : project
                    ? routes.project(project.id)
                    : undefined
              }
            />
            <span>
              <time dateTime={call.occurredAt}>{callWhen(call)}</time>
              {organizer && ` · ${fr.calls.page.organizedBy(organizer)}`}
            </span>
          </p>
        </div>
        {actions}
      </div>
    </header>
  );
}
