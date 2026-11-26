"use client";

import { Fragment } from "react";

import { CallStatusBadge } from "@/components/calls/call-badges";
import { CallProjectPill } from "@/components/calls/call-project-pill";
import { CallSheet } from "@/components/calls/call-sheet";
import { CallSheetMenu } from "@/components/calls/call-sheet-menu";
import { JoinCallLink } from "@/components/calls/join-call-link";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableGroupRow,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { TableSortProvider } from "@/components/ui/table-sort";
import { useSheetRow } from "@/components/ui/use-sheet-row";
import { canDeleteCall, type CallDeleter } from "@/lib/calls/delete-rule";
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
  deleter,
}: {
  calls: CallListItem[];
  // Reference time for "À venir", taken once by the page.
  now: Date;
  door: CallDoor;
  // Who looks: the director deletes every call, an owner theirs.
  deleter: CallDeleter;
}) {
  const t = fr.calls.all;
  const withProject = door.kind === "calls";
  const groups = inOrder(calls, now);
  const titled = groups.upcoming.length > 0 && groups.past.length > 0;
  const columns = withProject ? 5 : 4;
  // The calls as the table shows them (to come, then past): the sheet's ↑ ↓.
  const shown = CALL_VIEWS.flatMap((view) => groups[view]);
  const [sheet, setSheet] = useSheetRow(shown.map((call) => call.id));

  // One sort for the table and its sheet.
  return (
    <TableSortProvider>
      <DataTable>
        <DataTableHeader>
          <DataTableHead icon="call" fill>
            {t.columns.title}
          </DataTableHead>
          {withProject && (
            <DataTableHead icon="project" hideBelow="md">
              {t.columns.project}
            </DataTableHead>
          )}
          <DataTableHead icon="date" hideBelow="sm">
            {t.columns.date}
          </DataTableHead>
          <DataTableHead icon="status">{t.columns.status}</DataTableHead>
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
                  deletable={canDeleteCall(deleter, call)}
                  onOpen={() => setSheet(shown.indexOf(call))}
                />
              ))}
            </Fragment>
          ))}
        </DataTableBody>
      </DataTable>
      <CallSheet
        rows={shown}
        now={now}
        door={door}
        deletable={(call) => canDeleteCall(deleter, call)}
        index={sheet}
        onClose={() => setSheet(null)}
        onMove={setSheet}
      />
    </TableSortProvider>
  );
}

function CallRow({
  call,
  now,
  door,
  withProject,
  deletable,
  onOpen,
}: {
  call: CallListItem;
  now: Date;
  door: CallDoor;
  withProject: boolean;
  deletable: boolean;
  // Its side sheet (CallSheet).
  onOpen: () => void;
}) {
  const upcoming = isUpcoming(call, now);
  const slot = formatSlot(call);
  return (
    <DataTableRow>
      <DataTableCell fill className="max-w-0">
        <DataTableMedia
          // No phone repeated on every row (Sacha 24/11/2026).
          title={
            <DataTableLink href={callHref(door, call.id)} onOpen={onOpen}>
              {call.title}
            </DataTableLink>
          }
          // What its hidden columns say, on a phone.
          subtitle={
            <>
              {withProject && (
                <span className="md:hidden">
                  {call.deal
                    ? fr.calls.page.deal.pill(call.deal.artistName)
                    : (call.projectTitle ?? fr.calls.all.internal)}
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
            deal={call.deal}
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
