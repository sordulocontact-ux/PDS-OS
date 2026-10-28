"use client";

import { IconChevronDown } from "nucleo-sharp-essential";
import { Fragment, useState } from "react";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { work } from "@/lib/i18n/fr/work";
import { projectHue } from "@/lib/ui/category-hues";
import { workStatusTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";
import type { WorkGroup, WorkRow } from "@/lib/work/rows";

import { placeOf, rowBadge, titleOf } from "./work-row";

const fr = { work };

const t = fr.work.table;

// Every column, hidden ones included: a group's title row spans them all.
const COLUMNS = 5;

// On a phone the state keeps only its badge's width: the action needs the rest.
const STATE_COLUMN = "w-px whitespace-nowrap sm:w-48";
// A date and a tag need less than the 192 px of a column.
const DUE_COLUMN = "w-28";

/** What the row asks: a decision, PO's proposals, a project's handover
 * status, else a gesture to do. */
function RowState({ row }: { row: WorkRow }) {
  return (
    rowBadge(row) ?? (
      <StatusBadge tone={workStatusTone.todo} size="sm">
        {t.todo}
      </StatusBadge>
    )
  );
}

/** A group's title (« En retard  2 »), a button folding its rows (Asana's
 * sections). */
function GroupRow({
  group,
  count,
  open,
  onToggle,
}: {
  group: WorkGroup;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <TableRow className="border-0 hover:bg-transparent has-aria-expanded:bg-transparent">
      <TableCell colSpan={COLUMNS} className="px-0 pt-5 pb-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="-ml-1 flex items-center gap-2 rounded-sm px-1 text-[length:var(--type-body-md)] font-semibold text-[color:var(--text-primary)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [@media(hover:hover)]:hover:text-[color:var(--text-secondary)]"
        >
          <IconChevronDown
            aria-hidden
            className={cn(
              "size-3.5 text-[color:var(--text-tertiary)] transition-transform duration-[var(--duration-fast)] ease-[var(--ease-standard)] motion-reduce:transition-none",
              !open && "-rotate-90",
            )}
          />
          <span className={cn(group === "overdue" && "text-error")}>
            {t.groups[group]}
          </span>
          <span className="font-medium text-[color:var(--text-tertiary)] tabular-nums">
            {count}
          </span>
        </button>
      </TableCell>
    </TableRow>
  );
}

function ActionRow({ row }: { row: WorkRow }) {
  const place = placeOf(row);
  return (
    <DataTableRow>
      <DataTableCell fill className="max-w-0">
        <DataTableMedia
          title={<DataTableLink href={row.href}>{titleOf(row)}</DataTableLink>}
          subtitle={
            // The project shows here once its column is hidden.
            <>
              <span className="md:hidden">
                {[row.projectTitle, place].filter(Boolean).join(" · ")}
              </span>
              {place && <span className="hidden md:inline">{place}</span>}
            </>
          }
        />
      </DataTableCell>
      <DataTableCell hideBelow="md">
        <StatusBadge
          tone={projectHue(row.projectId)}
          size="sm"
          className="max-w-full"
        >
          <span className="truncate">{row.projectTitle}</span>
        </StatusBadge>
      </DataTableCell>
      <DataTableCell
        hideBelow="sm"
        className={cn(
          DUE_COLUMN,
          "tabular-nums",
          row.overdue
            ? "text-error"
            : !row.due && "text-[color:var(--text-tertiary)]",
        )}
      >
        {row.due ? formatShortDay(row.due, { bare: true }) : EMPTY_CELL}
      </DataTableCell>
      <DataTableCell
        hideBelow="xl"
        className={cn(!row.validator && "text-[color:var(--text-tertiary)]")}
      >
        <span className="block truncate">{row.validator ?? EMPTY_CELL}</span>
      </DataTableCell>
      <DataTableCell className={STATE_COLUMN}>
        <RowState row={row} />
      </DataTableCell>
    </DataTableRow>
  );
}

/**
 * The global Travail as one table (Asana « My tasks », Plane, GitLab): the
 * action and where it is, its project's tag, its due date, who validates,
 * what it asks; its rows under the groups by when, each foldable.
 */
export function WorkTable({
  groups,
}: {
  groups: { group: WorkGroup; rows: WorkRow[] }[];
}) {
  const [closed, setClosed] = useState<ReadonlySet<WorkGroup>>(new Set());
  const toggle = (group: WorkGroup) =>
    setClosed((current) => {
      const next = new Set(current);
      if (!next.delete(group)) next.add(group);
      return next;
    });

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.action}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.project}</DataTableHead>
        <DataTableHead hideBelow="sm" className={DUE_COLUMN}>
          {t.columns.due}
        </DataTableHead>
        <DataTableHead hideBelow="xl">{t.columns.validator}</DataTableHead>
        <DataTableHead className={STATE_COLUMN}>
          {t.columns.state}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {groups.map(({ group, rows }) => {
          const open = !closed.has(group);
          return (
            <Fragment key={group}>
              <GroupRow
                group={group}
                count={rows.length}
                open={open}
                onToggle={() => toggle(group)}
              />
              {open && rows.map((row) => <ActionRow key={row.key} row={row} />)}
            </Fragment>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
