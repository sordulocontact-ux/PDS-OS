import { IconPhone } from "nucleo-sharp-essential";
import { Fragment } from "react";

import { CallStatusBadge } from "@/components/calls/call-badges";
import { CallProjectPill } from "@/components/calls/call-project-pill";
import { CallSheetMenu } from "@/components/calls/call-sheet-menu";
import { JoinCallLink } from "@/components/calls/join-call-link";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableGroupRow,
  DataTableHead,
  DataTableHeader,
  DataTableIcon,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { callHref, type CallDoor } from "@/lib/calls/door";
import {
  callViewOf,
  CALL_VIEWS,
  formatSlot,
  isUpcoming,
} from "@/lib/calls/format";
import type { CallListItem } from "@/lib/calls/queries";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

// The actions' column: as wide as « Rejoindre » and « ⋯ », no more.
const ACTIONS_COLUMN = "w-px whitespace-nowrap";

/** Planned calls soonest first (the next one on top), then the others latest
 * first. */
function inOrder(rows: CallListItem[], now: Date) {
  const upcoming = rows
    .filter((call) => callViewOf(call, now) === "upcoming")
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const past = rows
    .filter((call) => callViewOf(call, now) === "past")
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return { upcoming, past };
}

/**
 * A list of calls, the same from both doors (lib/calls/door.ts): the row
 * opens the call where the list lives (Calls, or inside the project). The
 * next calls come first, soonest on top, then the past ones, latest on top;
 * titled « À venir » / « Passés » when both are shown (the « Tous » tab).
 * Columns: the call (its date under it on a phone), its project in its hue
 * (Calls only), when, its state, then « Rejoindre » while it is to come
 * and « ⋯ » (the call page's menu, shown on hover with a mouse).
 */
export function CallsTable({
  calls,
  now,
  door,
  deletable,
}: {
  calls: CallListItem[];
  // Reference time for "À venir", taken once by the page.
  now: Date;
  door: CallDoor;
  // The viewer may delete calls (archive_records).
  deletable: boolean;
}) {
  const t = fr.calls.all;
  const withProject = door.kind === "calls";
  const groups = inOrder(calls, now);
  const titled = groups.upcoming.length > 0 && groups.past.length > 0;
  const columns = withProject ? 5 : 4;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.title}</DataTableHead>
        {withProject && (
          <DataTableHead hideBelow="md">{t.columns.project}</DataTableHead>
        )}
        <DataTableHead hideBelow="sm">{t.columns.date}</DataTableHead>
        <DataTableHead>{t.columns.status}</DataTableHead>
        <DataTableHead className={ACTIONS_COLUMN}>
          <span className="sr-only">{t.columns.actions}</span>
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {CALL_VIEWS.map((view) => (
          <Fragment key={view}>
            {titled && (
              <DataTableGroupRow columns={columns}>
                <p className="flex items-center gap-2 text-[length:var(--type-body-md)] font-semibold text-[color:var(--text-primary)]">
                  {t.views[view]}
                  <span className="font-medium text-[color:var(--text-tertiary)] tabular-nums">
                    {groups[view].length}
                  </span>
                </p>
              </DataTableGroupRow>
            )}
            {groups[view].map((call) => (
              <CallRow
                key={call.id}
                call={call}
                now={now}
                door={door}
                withProject={withProject}
                deletable={deletable}
              />
            ))}
          </Fragment>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

function CallRow({
  call,
  now,
  door,
  withProject,
  deletable,
}: {
  call: CallListItem;
  now: Date;
  door: CallDoor;
  withProject: boolean;
  deletable: boolean;
}) {
  const upcoming = isUpcoming(call, now);
  const slot = formatSlot(call);
  return (
    <DataTableRow>
      <DataTableCell fill className="max-w-0">
        <DataTableMedia
          visual={<DataTableIcon icon={IconPhone} />}
          title={
            <DataTableLink href={callHref(door, call.id)}>
              {call.title}
            </DataTableLink>
          }
          // What its hidden columns say, on a phone.
          subtitle={
            <>
              {withProject && (
                <span className="md:hidden">
                  {call.projectTitle ?? fr.calls.all.internal}
                  <span className="sm:hidden"> · </span>
                </span>
              )}
              <span className="sm:hidden">{slot}</span>
            </>
          }
        />
      </DataTableCell>
      {withProject && (
        <DataTableCell hideBelow="md">
          <CallProjectPill
            projectId={call.projectId}
            title={call.projectTitle}
            size="sm"
          />
        </DataTableCell>
      )}
      <DataTableCell hideBelow="sm" className="tabular-nums">
        <time dateTime={call.occurredAt}>{slot}</time>
      </DataTableCell>
      <DataTableCell>
        <CallStatusBadge
          status={call.status}
          upcoming={upcoming}
          closed={call.closed}
        />
      </DataTableCell>
      <DataTableCell className={ACTIONS_COLUMN}>
        <div className="flex items-center justify-end gap-2">
          {call.meetingUrl && upcoming && (
            <JoinCallLink
              url={call.meetingUrl}
              title={call.title}
              size="sm"
              inRow
            />
          )}
          <CallSheetMenu
            call={call}
            deletable={deletable}
            size="icon-sm"
            reveal
          />
        </div>
      </DataTableCell>
    </DataTableRow>
  );
}
