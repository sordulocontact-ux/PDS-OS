"use client";

import { IconPenWriting4, IconPhone } from "nucleo-sharp-essential";

import { CallProjectPill } from "@/components/calls/call-project-pill";
import { CallSheet } from "@/components/calls/call-sheet";
import { CallSheetMenu } from "@/components/calls/call-sheet-menu";
import { NoteMenu } from "@/components/notes/note-menu";
import { NoteProjectPill } from "@/components/notes/note-project-pill";
import { NoteSheet } from "@/components/notes/note-sheet";
import { NotesPeople } from "@/components/notes/notes-people";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableIcon,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  DataTableText,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { TableSortProvider } from "@/components/ui/table-sort";
import { useSheetRow } from "@/components/ui/use-sheet-row";
import { ViewLink } from "@/components/ui/view-link";
import { canDeleteCall, type CallDeleter } from "@/lib/calls/delete-rule";
import { callHref, type CallDoor } from "@/lib/calls/door";
import { formatDateTime } from "@/lib/calls/format";
import { notes } from "@/lib/i18n/fr/notes";
import type { NoteProjectOption } from "@/lib/notes/options";
import { noteViewOf, type NoteRow } from "@/lib/notes/views";

const fr = { notes };

export const rowId = (row: NoteRow) =>
  row.kind === "call" ? row.call.id : row.id;

/**
 * The rows of a door's Notes (calls with their content, notes written by
 * hand), in the order given: the note (icon of its kind, its date under its
 * name), its project (Notes only), the beginning of its content, who is in
 * it, « ⋯ ». A call opens in CallSheet, a written note in NoteSheet, ↑ ↓
 * following the order shown (a sort of the head included). A past call
 * without report offers « Compléter », its page.
 */
export function NotesTable({
  rows,
  now,
  door,
  deleter,
  projects,
}: {
  rows: NoteRow[];
  now: Date;
  door: CallDoor;
  deleter: CallDeleter;
  projects: NoteProjectOption[];
}) {
  const t = fr.notes.columns;
  const withProject = door.kind === "calls";
  const [sheet, setSheet] = useSheetRow(rows.map(rowId));
  const open = sheet === null ? null : (rows[sheet] ?? null);
  // CallSheet reads the calls by place: the other rows hold the open call's
  // place, never shown (↑ ↓ move by place in the whole table).
  const callSlots =
    open?.kind === "call"
      ? rows.map((row) => (row.kind === "call" ? row.call : open.call))
      : [];

  return (
    <TableSortProvider>
      <DataTable>
        <DataTableHeader>
          <DataTableHead icon="call" fill>
            {t.note}
          </DataTableHead>
          {withProject && (
            <DataTableHead icon="project" hideBelow="md">
              {t.project}
            </DataTableHead>
          )}
          <DataTableHead icon="note" hideBelow="lg">
            {t.content}
          </DataTableHead>
          <DataTableHead icon="people" hideBelow="sm">
            {t.by}
          </DataTableHead>
          <DataTableActionsHead label={t.actions} />
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row, index) => (
            <NoteTableRow
              key={rowId(row)}
              row={row}
              now={now}
              door={door}
              withProject={withProject}
              deleter={deleter}
              projects={projects}
              onOpen={() => setSheet(index)}
            />
          ))}
        </DataTableBody>
      </DataTable>
      {open?.kind === "call" && sheet !== null && (
        <CallSheet
          rows={callSlots}
          now={now}
          door={door}
          deletable={(call) => canDeleteCall(deleter, call)}
          index={sheet}
          onClose={() => setSheet(null)}
          onMove={setSheet}
        />
      )}
      {open?.kind === "written" && sheet !== null && (
        <NoteSheet
          note={open}
          projects={projects}
          index={sheet}
          total={rows.length}
          onClose={() => setSheet(null)}
          onMove={setSheet}
        />
      )}
    </TableSortProvider>
  );
}

function NoteTableRow({
  row,
  now,
  door,
  withProject,
  deleter,
  projects,
  onOpen,
}: {
  row: NoteRow;
  now: Date;
  door: CallDoor;
  withProject: boolean;
  deleter: CallDeleter;
  projects: NoteProjectOption[];
  onOpen: () => void;
}) {
  const t = fr.notes;
  const isCall = row.kind === "call";
  const title = isCall ? row.call.title : row.title;
  const date = formatDateTime(isCall ? row.call.occurredAt : row.updatedAt);
  const projectTitle = isCall
    ? row.call.deal
      ? row.call.deal.artistName
      : row.call.projectTitle
    : row.projectTitle;
  const people = isCall ? row.people : [row.author];
  const todo = noteViewOf(row, now) === "todo";
  return (
    <DataTableRow>
      <DataTableCell fill className="sm:min-w-64">
        <DataTableMedia
          visual={<DataTableIcon icon={isCall ? IconPhone : IconPenWriting4} />}
          title={
            <DataTableLink href={null} onOpen={onOpen}>
              {title}
            </DataTableLink>
          }
          subtitle={
            <>
              <time dateTime={isCall ? row.call.occurredAt : row.updatedAt}>
                {date}
              </time>
              {/* The project column is hidden under md. */}
              {withProject && (
                <span className="md:hidden">
                  {" · "}
                  {projectTitle ?? (isCall ? t.internalCall : t.teamNote)}
                </span>
              )}
            </>
          }
        />
      </DataTableCell>
      {withProject && (
        <DataTableCell hideBelow="md">
          {isCall ? (
            <CallProjectPill
              projectId={row.call.projectId}
              title={row.call.projectTitle}
              deal={row.call.deal}
              size="sm"
            />
          ) : (
            <NoteProjectPill
              projectId={row.projectId}
              title={row.projectTitle}
            />
          )}
        </DataTableCell>
      )}
      <DataTableCell hideBelow="lg">
        {isCall && todo ? (
          <ViewLink
            href={callHref(door, row.call.id)}
            className="relative z-10 text-[color:var(--text-link)] outline-none hover:underline focus-visible:underline"
          >
            {t.complete}
          </ViewLink>
        ) : (
          <DataTableText className="max-w-xs">
            {row.excerpt || EMPTY_CELL}
          </DataTableText>
        )}
      </DataTableCell>
      <DataTableCell hideBelow="sm" sort={people[0]?.name ?? ""}>
        <NotesPeople people={people} />
      </DataTableCell>
      <DataTableActionsCell>
        {isCall ? (
          <CallSheetMenu
            call={row.call}
            deletable={canDeleteCall(deleter, row.call)}
            size="icon-sm"
            reveal
          />
        ) : (
          row.mine && (
            <NoteMenu note={row} projects={projects} size="icon-sm" reveal />
          )
        )}
      </DataTableActionsCell>
    </DataTableRow>
  );
}
