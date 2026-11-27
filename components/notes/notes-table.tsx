"use client";

import { IconPenWriting4, IconPhone } from "nucleo-sharp-essential";

import { CallSheet } from "@/components/calls/call-sheet";
import { CallSheetMenu } from "@/components/calls/call-sheet-menu";
import { NoteLinkPill } from "@/components/notes/note-link-pill";
import { NoteMenu } from "@/components/notes/note-menu";
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
import type { NoteLinkChoices } from "@/lib/notes/options";
import {
  noteViewOf,
  type CallNoteRow,
  type NoteLink,
  type NoteRow,
} from "@/lib/notes/views";

const fr = { notes };

export const rowId = (row: NoteRow) =>
  row.kind === "call" ? row.call.id : row.id;

/**
 * The rows of a door's Notes (calls with their content, notes written by
 * hand), in the order given: the note (icon of its kind and its title only),
 * what it is linked to (Notes only), the beginning of its content, its date
 * in a column of its own after it (one fact per cell, Sacha 27/11/2026), who
 * is in it, « ⋯ ». A call opens in CallSheet, a written note in NoteSheet, ↑ ↓
 * following the order shown (a sort of the head included). A past call
 * without report offers « Compléter », its page.
 */
export function NotesTable({
  rows,
  now,
  door,
  deleter,
  choices,
}: {
  rows: NoteRow[];
  now: Date;
  door: CallDoor;
  deleter: CallDeleter;
  choices: NoteLinkChoices;
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
          <DataTableHead icon="notes" fill>
            {t.note}
          </DataTableHead>
          {withProject && (
            <DataTableHead icon="relation" hideBelow="md">
              {t.link}
            </DataTableHead>
          )}
          <DataTableHead icon="note" hideBelow="lg">
            {t.content}
          </DataTableHead>
          <DataTableHead icon="date" hideBelow="sm">
            {t.date}
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
          choices={choices}
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
  onOpen,
}: {
  row: NoteRow;
  now: Date;
  door: CallDoor;
  withProject: boolean;
  deleter: CallDeleter;
  onOpen: () => void;
}) {
  const t = fr.notes;
  const isCall = row.kind === "call";
  const title = isCall ? row.call.title : row.title;
  const at = isCall ? row.call.occurredAt : row.updatedAt;
  const date = formatDateTime(at);
  const people = isCall ? row.people : [row.author];
  const todo = noteViewOf(row, now) === "todo";
  return (
    <DataTableRow>
      <DataTableCell fill className="sm:min-w-52">
        <DataTableMedia
          visual={<DataTableIcon icon={isCall ? IconPhone : IconPenWriting4} />}
          title={
            <DataTableLink href={null} onOpen={onOpen}>
              {title}
            </DataTableLink>
          }
        />
      </DataTableCell>
      {withProject && (
        <DataTableCell hideBelow="md">
          {isCall ? (
            <NoteLinkPill
              link={callLink(row.call)}
              emptyLabel={t.internalCall}
              open
            />
          ) : (
            <NoteLinkPill link={row.link} open />
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
          <DataTableText className="max-w-64">
            {row.excerpt || EMPTY_CELL}
          </DataTableText>
        )}
      </DataTableCell>
      <DataTableCell hideBelow="sm" sort={at}>
        <DataTableText>
          <time dateTime={at}>{date}</time>
        </DataTableText>
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
          row.mine && <NoteMenu note={row} size="icon-sm" reveal />
        )}
      </DataTableActionsCell>
    </DataTableRow>
  );
}

// A call's « Lié à », as a written note's: its deal, else its project, else
// none (« Réunion interne »).
function callLink(call: CallNoteRow["call"]): NoteLink | null {
  if (call.deal)
    return {
      kind: "deal",
      id: call.deal.id,
      label: fr.notes.link.deal(call.deal.artistName),
    };
  if (call.projectId && call.projectTitle)
    return { kind: "project", id: call.projectId, label: call.projectTitle };
  return null;
}
